import { error } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { challenges, statusEvents, places } from '$lib/server/db/schema';
import { needResult } from '$lib/server/match/pipeline';
import { similarNeeds } from '$lib/server/similar';
import { fitLabel } from '$lib/server/match/policy';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!/^[0-9a-f-]{36}$/.test(params.id)) error(404, { message: 'Nie znaleziono' });
	const r = await needResult(params.id);
	if (!r) error(404, { message: 'Nie znaleziono zgłoszenia' });
	const { need } = r;
	const isOwnerOrAdmin =
		locals.user?.role === 'admin' || (need.authorId && need.authorId === locals.user?.id);

	const [timeline, challenge, place, similar] = await Promise.all([
		db
			.select()
			.from(statusEvents)
			.where(and(eq(statusEvents.subjectType, 'need'), eq(statusEvents.subjectId, need.id)))
			.orderBy(asc(statusEvents.createdAt)),
		need.challengeId
			? db.query.challenges.findFirst({ where: eq(challenges.id, need.challengeId) })
			: undefined,
		need.placeTeryt
			? db.query.places.findFirst({ where: eq(places.teryt, need.placeTeryt) })
			: undefined,
		similarNeeds(need)
	]);

	const card = (x: (typeof r.matches)[number]) => ({
		id: x.id,
		slug: x.innovation.slug,
		title: x.innovation.title,
		summary: x.innovation.summary,
		stage: x.innovation.stage,
		reason: x.reason,
		fit: fitLabel(x.jevScore),
		pGood: x.pGood,
		highlights: x.highlights,
		accepted: !!x.acceptedAt,
		ranks: { bm25: x.bm25Rank, knn: x.knnRank, rrf: x.rrfRank, jev: x.jevScore }
	});

	return {
		need: {
			id: need.id,
			// the author and admins see their own words; everyone else sees the redacted text
			text: isOwnerOrAdmin ? need.rawText : need.redactedText,
			status: need.status,
			areaSlug: need.areaSlug,
			targetGroups: need.targetGroups,
			createdAt: need.createdAt,
			place: place ? { name: place.name, powiat: place.powiat } : null
		},
		matches: r.matches.map(card),
		uncertain: r.uncertain.map(card),
		challenge: challenge
			? { id: challenge.id, title: challenge.title, needCount: challenge.needCount }
			: null,
		similar,
		timeline: timeline.map((t) => ({ status: t.status, note: t.note, at: t.createdAt })),
		canAccept: !!isOwnerOrAdmin,
		showRanks: locals.user?.role === 'admin'
	};
};
