import { error, json } from '@sveltejs/kit';
import { classifySchema } from '$lib/schemas/need';
import { classifyNeed } from '$lib/server/match/classify';
import { rateLimit } from '$lib/server/ratelimit';
import { taxonomy } from '$lib/server/taxonomy';
import type { RequestHandler } from './$types';

/** Live intake classification (Jev, ~70-500 ms). Returns labels ready for the chips. */
export const POST: RequestHandler = async ({ request, locals }) => {
	const parsed = classifySchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) error(400, { message: 'Tekst jest za krótki lub za długi.' });
	await rateLimit(locals.clientKey, 'classify');
	const [c, { areas, groups }] = await Promise.all([classifyNeed(parsed.data.text), taxonomy()]);
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
		place: c.place ?? null
	});
};
