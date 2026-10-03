// Matchmaking policy: every threshold in one place, tuned with scripts/eval-match.ts.
import { pAtLeast } from '../ai/decision';

export const POLICY = {
	/** candidates sent to the reranker after fusion */
	rerankDepth: 20,
	/** P(fit score ≥ GOOD_LEVEL) needed to call something a match */
	pGoodThreshold: 0.6,
	goodLevel: 3,
	maxShown: 5,
	uncertainShown: 3,
	/** MMR trade-off between relevance and diversity */
	mmrLambda: 0.7,
	/** attach a need to an existing challenge when P(same problem) ≥ this */
	sameChallengeThreshold: 0.7,
	similarNeedsMinCosine: 0.8,
	/** intake: hold for human moderation when P(personal data) ≥ this */
	piiHold: 0.5,
	/** intake: hold on any real suspicion of profanity or threats (lexical hits always hold) */
	abuseHold: 0.3,
	/** intake: hold when P(describes a social problem) < this, so it cannot become a challenge */
	notNeedHold: 0.3
} as const;

export type ModerationReason = 'pii' | 'abuse' | 'not_need';

/** Reasons to hold a classified need for moderation; empty means it may be published. */
export function moderationReasons(
	c: { pii: number; abusive: number; isNeed: number },
	lexicalAbuse: boolean,
	approved: boolean
): ModerationReason[] {
	const out: ModerationReason[] = [];
	if (c.pii >= POLICY.piiHold) out.push('pii');
	// once ROPS approved the text, only fresh personal data can hold it again
	if (approved) return out;
	if (lexicalAbuse || c.abusive >= POLICY.abuseHold) out.push('abuse');
	if (c.isNeed < POLICY.notNeedHold) out.push('not_need');
	return out;
}

export type Scored = {
	id: string;
	rrfRank: number;
	jevScore: number;
	pGood: number;
	confidence: number;
};

export function scoreFromAnswer(
	id: string,
	rrfRank: number,
	a: { score: number; confidence: number; probabilities: Record<string, number> }
): Scored {
	return {
		id,
		rrfRank,
		jevScore: a.score,
		pGood: pAtLeast(a.probabilities, POLICY.goodLevel),
		confidence: a.confidence
	};
}

/** Splits reranked candidates into confident matches and uncertain related items. */
export function decide(scored: Scored[]): {
	kept: Scored[];
	uncertain: Scored[];
	isChallenge: boolean;
} {
	const order = (a: Scored, b: Scored) => b.jevScore - a.jevScore || a.rrfRank - b.rrfRank;
	const kept = scored.filter((s) => s.pGood >= POLICY.pGoodThreshold).sort(order);
	if (kept.length) return { kept, uncertain: [], isChallenge: false };
	return {
		kept: [],
		uncertain: [...scored].sort(order).slice(0, POLICY.uncertainShown),
		isChallenge: true
	};
}

/** Plain-language fit label for the UI (never colour alone). */
export function fitLabel(
	jevScore: number | null | undefined
): 'direct' | 'good' | 'partial' | 'weak' {
	if (jevScore == null) return 'weak';
	if (jevScore >= 3.5) return 'direct';
	if (jevScore >= 2.6) return 'good';
	if (jevScore >= 1.8) return 'partial';
	return 'weak';
}
