import { describe, it, expect } from 'vitest';
import { decide, scoreFromAnswer, fitLabel, POLICY } from './policy';

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
