// Unmatched needs become open challenges: attach to an existing one when the decision
// model says it is the same unmet problem, otherwise create a new challenge.
import { eq, sql as dsql } from 'drizzle-orm';
import { db } from '../db';
import { challenges, needs } from '../db/schema';
import { es } from '../search/es';
import { INDEX } from '../search/indices';
import { decisions } from '../ai/decision';
import { sameChallengeQuestions } from '../ai/questions';
import { challengeText } from '../ai/prompts';
import { embedOne } from '../ai/embed';
import { indexChallenge } from '../search/sync';
import { POLICY } from './policy';

export async function assignChallenge(need: {
	id: string;
	redactedText: string;
	areaSlug: string;
	placeTeryt: string | null;
	embedding: number[];
}): Promise<{ id: string; created: boolean }> {
	const res = await es.search<{ title: string; description: string }>({
		index: INDEX.challenges,
		size: 3,
		knn: {
			field: 'embedding',
			query_vector: need.embedding,
			k: 3,
			num_candidates: 50,
			filter: [{ term: { open: true } }, { term: { area_slug: need.areaSlug } }]
		},
		_source: ['title', 'description']
	});
	const hits = res.hits.hits.filter((h) => h._id && h._source);

	if (hits.length) {
		const keys = hits.map((_, i) => `c${i + 1}`);
		const ans = (await decisions().ask(
			'challenge.attach',
			{
				need: { text: need.redactedText },
				challenges: Object.fromEntries(hits.map((h, i) => [keys[i], h._source!]))
			},
			sameChallengeQuestions(keys)
		)) as Record<string, { noul: number }>;
		let best = -1;
		let bestP = 0;
		keys.forEach((k, i) => {
			const p = ans[`same_${k}`]?.noul ?? 0;
			if (p > bestP) [best, bestP] = [i, p];
		});
		if (best >= 0 && bestP >= POLICY.sameChallengeThreshold) {
			const id = hits[best]._id!;
			await db
				.update(challenges)
				.set({
					needCount: dsql`${challenges.needCount} + 1`,
					placeTeryts: need.placeTeryt
						? dsql`array(select distinct unnest(${challenges.placeTeryts} || array[${need.placeTeryt}]::text[]))`
						: challenges.placeTeryts
				})
				.where(eq(challenges.id, id));
			await db.update(needs).set({ challengeId: id }).where(eq(needs.id, need.id));
			await indexChallenge(id);
			return { id, created: false };
		}
	}

	const text = await challengeText([need.redactedText]);
	const [c] = await db
		.insert(challenges)
		.values({
			title: text.title,
			description: text.description,
			areaSlug: need.areaSlug,
			needCount: 1,
			placeTeryts: need.placeTeryt ? [need.placeTeryt] : [],
			embedding: await embedOne(`${text.title}. ${text.description}`, 'document')
		})
		.returning({ id: challenges.id });
	await db.update(needs).set({ challengeId: c.id }).where(eq(needs.id, need.id));
	await indexChallenge(c.id, true);
	return { id: c.id, created: true };
}
