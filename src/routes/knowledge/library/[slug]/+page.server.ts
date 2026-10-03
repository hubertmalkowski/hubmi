import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { innovations, testCampaigns, translations } from '$lib/server/db/schema';
import { relatedInnovations } from '$lib/server/library';
import { enqueue, QUEUES } from '$lib/server/jobs/boss';
import { hash } from '$lib/server/ai/text';
import { getLocale } from '$lib/paraglide/runtime';
import { and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders, locals }) => {
	const inno = await db.query.innovations.findFirst({ where: eq(innovations.slug, params.slug) });
	if (!inno || inno.status !== 'published') error(404, { message: 'Nie znaleziono innowacji' });
	if (!locals.user) setHeaders({ 'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600' });

	const [related, campaigns] = await Promise.all([
		relatedInnovations(inno.id, inno.embedding),
		db.select().from(testCampaigns).where(and(eq(testCampaigns.innovationId, inno.id), eq(testCampaigns.open, true)))
	]);

	// Polish is the source of truth; other locales use cached translations, filled lazily.
	const locale = getLocale();
	let translated: Record<string, string> = {};
	let translating = false;
	if (locale !== 'pl') {
		const rows = await db
			.select()
			.from(translations)
			.where(and(eq(translations.entity, 'innovation'), eq(translations.entityId, inno.id), eq(translations.locale, locale)));
		const fields = { title: inno.title, summary: inno.summary, description: inno.description };
		for (const [field, text] of Object.entries(fields)) {
			const hit = rows.find((r) => r.field === field && r.contentHash === hash(text));
			if (hit) translated[field] = hit.text;
			else {
				translating = true;
				await enqueue(QUEUES.translateFill, { entity: 'innovation', entityId: inno.id, field, locale, text }, { singletonKey: `${inno.id}:${field}:${locale}` });
			}
		}
	}

	return {
		innovation: {
			id: inno.id,
			slug: inno.slug,
			title: translated.title ?? inno.title,
			summary: translated.summary ?? inno.summary,
			description: translated.description ?? inno.description,
			areaSlug: inno.areaSlug,
			targetGroups: inno.targetGroups,
			stage: inno.stage,
			videoUrl: inno.videoUrl,
			implementationNotes: inno.implementationNotes,
			costHint: inno.costHint
		},
		translating,
		related,
		campaigns: campaigns.map((c) => ({ id: c.id, title: c.title }))
	};
};
