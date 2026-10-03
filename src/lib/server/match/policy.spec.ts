import { describe, it, expect } from 'vitest';
import { decide, scoreFromAnswer, fitLabel, moderationReasons, POLICY } from './policy';

const ans = (p: number[]) => ({
	score: p.reduce((s, x, i) => s + i * x, 0),
	confidence: Math.max(...p),
	probabilities: Object.fromEntries(p.map((x, i) => [String(i), x]))
});

describe('scoreFromAnswer', () => {
	it('computes P(score >= good level) from the distribution', () => {
		const s = scoreFromAnswer('a', 1, ans([0, 0.1, 0.2, 0.3, 0.4]));
		expect(s.pGood).toBeCloseTo(0.7);
		expect(s.jevScore).toBeCloseTo(3);
	});
});

describe('decide', () => {
	it('keeps confident matches sorted by score, then fused rank', () => {
		const scored = [
			scoreFromAnswer('a', 1, ans([0, 0, 0.2, 0.5, 0.3])),
			scoreFromAnswer('b', 2, ans([0, 0, 0, 0.2, 0.8])),
			scoreFromAnswer('c', 3, ans([0.5, 0.5, 0, 0, 0]))
		];
		const d = decide(scored);
		expect(d.isChallenge).toBe(false);
		expect(d.kept.map((s) => s.id)).toEqual(['b', 'a']);
	});

	it('falls back to a challenge with uncertain items when nothing passes', () => {
		const scored = [1, 2, 3, 4].map((r) =>
			scoreFromAnswer(`x${r}`, r, ans([0.2, 0.3, 0.3, 0.1, 0.1]))
		);
		const d = decide(scored);
		expect(d.isChallenge).toBe(true);
		expect(d.kept).toEqual([]);
		expect(d.uncertain).toHaveLength(POLICY.uncertainShown);
	});

	it('treats an empty candidate list as a challenge', () => {
		expect(decide([]).isChallenge).toBe(true);
	});
});

describe('fitLabel', () => {
	it('maps expected scores to plain-language labels', () => {
		expect(fitLabel(3.8)).toBe('direct');
		expect(fitLabel(3)).toBe('good');
		expect(fitLabel(2)).toBe('partial');
		expect(fitLabel(0.5)).toBe('weak');
		expect(fitLabel(null)).toBe('weak');
	});
});

describe('moderationReasons', () => {
	const clean = { pii: 0.05, abusive: 0.02, isNeed: 0.95 };

	it('publishes a clean need', () => {
		expect(moderationReasons(clean, false, false)).toEqual([]);
	});

	it('holds any suspicion of abuse, from the model or the word list', () => {
		expect(moderationReasons({ ...clean, abusive: 0.35 }, false, false)).toEqual(['abuse']);
		expect(moderationReasons(clean, true, false)).toEqual(['abuse']);
	});

	it('holds text that is probably not a social problem, so it cannot become a challenge', () => {
		expect(moderationReasons({ ...clean, isNeed: 0.1 }, false, false)).toEqual(['not_need']);
	});

	it('collects every reason that applies', () => {
		expect(moderationReasons({ pii: 0.9, abusive: 0.9, isNeed: 0.1 }, true, false)).toEqual([
			'pii',
			'abuse',
			'not_need'
		]);
	});

	it('does not re-hold an approved need except for new personal data', () => {
		expect(moderationReasons({ ...clean, abusive: 0.9, isNeed: 0.1 }, true, true)).toEqual([]);
		expect(moderationReasons({ ...clean, pii: 0.9 }, false, true)).toEqual(['pii']);
	});
});
