// Need processing: redact → classify → embed → index → hybrid retrieval → Jev rerank
// → match-or-challenge decision → reasons → timeline and notifications.
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { needs, matches, innovations } from '../db/schema';
import { classifyNeed, redactPii, TARGET_GROUP_THRESHOLD } from './classify';
import { embedOne } from '../ai/embed';
import { normalizePl, matchReasons, type Locale } from '../ai/prompts';
import { decisions } from '../ai/decision';
import { matchFitQuestions } from '../ai/questions';
import { hybridSearch, type HybridHit } from '../search/hybrid';
import { indexNeed } from '../search/sync';
import { mmr } from '../search/rrf';
import { overlap } from '../ai/text';
import { POLICY, decide, scoreFromAnswer, type Scored } from './policy';
import { assignChallenge } from './challenges';
import { addStatus, notify, notifyAdmins } from '../status';

export type Step = 'redact' | 'classify' | 'search' | 'rerank' | 'decide' | 'done';
export type Progress = (step: Step, detail?: Record<string, unknown>) => void | Promise<void>;

export async function processNeed(needId: string, progress: Progress = () => {}) {
	const need = await db.query.needs.findFirst({ where: eq(needs.id, needId) });
	if (!need) throw new Error(`need ${needId} not found`);
	await db.update(needs).set({ status: 'processing' }).where(eq(needs.id, needId));

	// 1. Personal data: redact before anything leaves for search or Claude.
	await progress('redact');
	const redaction = await redactPii(need.rawText);
	const redacted = redaction.text;

	// 2. Classification on the redacted text.
	await progress('classify');
	const c = await classifyNeed(redacted);
	if (c.pii >= 0.5) {
		await db
			.update(needs)
			.set({ redactedText: redacted, piiFlag: true, status: 'moderation', areaSlug: c.area.slug })
			.where(eq(needs.id, needId));
		await addStatus('need', needId, 'moderation', 'Zgłoszenie może zawierać dane osobowe i czeka na moderację.');
		await notifyAdmins('need.moderation', 'need', needId);
		await progress('done', { status: 'moderation' });
		return { status: 'moderation' as const };
	}

	const locale = need.locale as Locale;
	const normalized = locale === 'pl' ? null : await normalizePl(redacted);
	const targetGroups = c.targetGroups.filter((g) => g.p >= TARGET_GROUP_THRESHOLD).map((g) => g.slug);
	const placeTeryt = need.placeTeryt ?? c.place?.teryt ?? null;
	const [docVector, queryVector] = await Promise.all([embedOne(redacted, 'document'), embedOne(redacted, 'query')]);

	await db
		.update(needs)
		.set({
			redactedText: redacted,
			normalizedPl: normalized,
			piiFlag: redaction.spans.length > 0,
			areaSlug: c.area.slug,
			areaConfidence: c.area.confidence,
			targetGroups,
			placeTeryt,
			urgency: c.urgency,
			embedding: docVector
		})
		.where(eq(needs.id, needId));
	await indexNeed(needId);

	// 3. Hybrid retrieval.
	await progress('search');
	const hits = await hybridSearch({
		text: normalized ?? redacted,
		vector: queryVector,
		area: { slug: c.area.slug, confidence: c.area.confidence },
		targetGroups,
		size: POLICY.rerankDepth
	});

	// 4. Rerank with one decision request (a Score per candidate, in parallel).
	await progress('rerank', { candidates: hits.length });
	const scored = await rerank(redacted, placeTeryt, targetGroups, hits);

	// 5. Decide, diversify, store.
	await progress('decide');
	const { kept, uncertain, isChallenge } = decide(scored);
	const byId = new Map(hits.map((h) => [h.id, h]));
	const shown = mmr(
		kept,
		(s) => s.jevScore / 4,
		(a, b) => overlap(docText(byId.get(a.id)), docText(byId.get(b.id))),
		POLICY.maxShown,
		POLICY.mmrLambda
	);
	const explain = (shown.length ? shown : uncertain).map((s) => ({
		id: s.id,
		title: byId.get(s.id)!.doc.title,
		summary: byId.get(s.id)!.doc.summary
	}));
	const reasons = await matchReasons(redacted, explain, locale).catch(() => ({}) as Record<string, string>);
	const shownIds = new Set(shown.map((s) => s.id));

	await db.delete(matches).where(eq(matches.needId, needId));
	if (scored.length) {
		await db.insert(matches).values(
			scored.map((s) => {
				const h = byId.get(s.id)!;
				return {
					needId,
					innovationId: s.id,
					bm25Rank: h.bm25Rank,
					knnRank: h.knnRank,
					rrfRank: s.rrfRank,
					jevScore: s.jevScore,
					pGood: s.pGood,
					confidence: s.confidence,
					kept: shownIds.has(s.id),
					reason: (reasons as Record<string, string>)[s.id] ?? null,
					highlights: h.highlights
				};
			})
		);
	}

	let challengeId: string | null = null;
	if (isChallenge) {
		const ch = await assignChallenge({
			id: needId,
			redactedText: redacted,
			areaSlug: c.area.slug,
			placeTeryt,
			embedding: docVector
		});
		challengeId = ch.id;
	}
	const status = isChallenge ? ('challenge' as const) : ('matched' as const);
	await db.update(needs).set({ status, challengeId }).where(eq(needs.id, needId));
	await indexNeed(needId);
	await addStatus(
		'need',
		needId,
		status,
		isChallenge ? 'Brak pewnego dopasowania: potrzeba trafiła do otwartych wyzwań.' : `Znaleziono ${shown.length} dopasowań.`
	);
	if (need.authorId) await notify([need.authorId], `need.${status}`, 'need', needId);
	if (c.pUrgent >= 0.5) await notifyAdmins('need.urgent', 'need', needId);

	await progress('done', { status });
	return { status, kept: shown.length, challengeId };
}

async function rerank(text: string, placeTeryt: string | null, groups: string[], hits: HybridHit[]): Promise<Scored[]> {
	if (!hits.length) return [];
	const keys = hits.map((_, i) => `c${i + 1}`);
	const state = {
		need: { text, place: placeTeryt, target_groups: groups },
		candidates: Object.fromEntries(
			hits.map((h, i) => [
				keys[i],
				{ title: h.doc.title, summary: h.doc.summary, target_groups: h.doc.target_groups, stage: h.doc.stage }
			])
		)
	};
	try {
		const ans = (await decisions().ask('match.rerank', state, matchFitQuestions(keys))) as Record<
			string,
			{ score: number; confidence: number; probabilities: Record<string, number> }
		>;
		return hits.map((h, i) => scoreFromAnswer(h.id, i + 1, ans[`fit_${keys[i]}`]));
	} catch (e) {
		// Decision layer unavailable: keep RRF order, never claim a confident match.
		console.warn('[match] rerank failed, using RRF order', (e as Error).message);
		return hits.map((h, i) => ({ id: h.id, rrfRank: i + 1, jevScore: 0, pGood: 0, confidence: 0 }));
	}
}

function docText(h: HybridHit | undefined) {
	return h ? `${h.doc.title} ${h.doc.summary}` : '';
}

/** Loads a processed need with its shown matches, for the results page and API. */
export async function needResult(needId: string) {
	const need = await db.query.needs.findFirst({ where: eq(needs.id, needId) });
	if (!need) return null;
	const rows = await db.select().from(matches).where(eq(matches.needId, needId));
	const inno = rows.length
		? await db.select().from(innovations).where(
				inArray(
					innovations.id,
					rows.map((r) => r.innovationId)
				)
			)
		: [];
	const byId = new Map(inno.map((i) => [i.id, i]));
	const withDoc = rows
		.map((r) => ({ ...r, innovation: byId.get(r.innovationId)! }))
		.filter((r) => r.innovation)
		.sort((a, b) => (b.jevScore ?? 0) - (a.jevScore ?? 0) || a.rrfRank - b.rrfRank);
	return {
		need,
		matches: withDoc.filter((r) => r.kept),
		uncertain: need.status === 'challenge' ? withDoc.slice(0, POLICY.uncertainShown) : [],
		all: withDoc
	};
}
