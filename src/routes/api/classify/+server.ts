import { error, json } from '@sveltejs/kit';
import { classifySchema } from '$lib/schemas/need';
import { classifyNeed } from '$lib/server/match/classify';
import { rateLimit } from '$lib/server/ratelimit';
import { taxonomy } from '$lib/server/taxonomy';
import { hybridSearch } from '$lib/server/search/hybrid';
import type { RequestHandler } from './$types';

/** Innovations both BM25 and kNN rank in their top 10: a cheap "likely relevant" signal. */
const PREVIEW_DEPTH = 10;
const PREVIEW_SIZE = 3;

async function preview(text: string) {
	const hits = await hybridSearch({ text, size: 20, depth: 20 });
	return hits
		.filter(
			(h) => (h.bm25Rank ?? Infinity) <= PREVIEW_DEPTH && (h.knnRank ?? Infinity) <= PREVIEW_DEPTH
		)
		.slice(0, PREVIEW_SIZE)
		.map((h) => ({ slug: h.doc.slug, title: h.doc.title }));
}

/**
 * Live intake classification (Jev, ~70-500 ms) plus a retrieval-only preview of likely
 * related innovations. The preview is not a match verdict: reranking happens after submit.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const parsed = classifySchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) error(400, { message: 'Tekst jest za krótki lub za długi.' });
	await rateLimit(locals.clientKey, 'classify');
	const [c, { areas, groups }, related] = await Promise.all([
		classifyNeed(parsed.data.text),
		taxonomy(),
		// search is optional here: ES or embeddings being down must not break classification
		preview(parsed.data.text).catch(() => [])
	]);
	const areaName = new Map(areas.map((a) => [a.slug, a.namePl]));
	const groupName = new Map(groups.map((g) => [g.slug, g.namePl]));
	return json({
		area: { ...c.area, name: areaName.get(c.area.slug) ?? c.area.slug },
		target_groups: c.targetGroups
			.filter((g) => g.p >= 0.6)
			.map((g) => ({ ...g, name: groupName.get(g.slug) ?? g.slug })),
		urgency: c.urgency,
		urgent: c.pUrgent >= 0.5,
		is_need: c.isNeed,
		pii: c.pii,
		place: c.place ?? null,
		preview: related
	});
};
