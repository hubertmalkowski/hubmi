import { describe, it, expect } from 'vitest';
import { rrf, linear, mmr, RRF_K } from './rrf';

describe('rrf', () => {
	it('sums reciprocal ranks across lists', () => {
		const out = rrf([
			[
				{ id: 'a', score: 9 },
				{ id: 'b', score: 5 }
			],
			[
				{ id: 'b', score: 0.9 },
				{ id: 'c', score: 0.8 }
			]
		]);
		expect(out.map((f) => f.id)).toEqual(['b', 'a', 'c']);
		const b = out.find((f) => f.id === 'b')!;
		expect(b.score).toBeCloseTo(1 / (RRF_K + 2) + 1 / (RRF_K + 1));
		expect(b.ranks).toEqual([2, 1]);
	});

	it('gives zero contribution for documents missing from a list', () => {
		const out = rrf([[{ id: 'a', score: 1 }], []]);
		expect(out[0]).toMatchObject({ id: 'a', ranks: [1, undefined] });
		expect(out[0].score).toBeCloseTo(1 / (RRF_K + 1));
	});

	it('breaks ties by best single rank, then id', () => {
		const out = rrf([
			[
				{ id: 'x', score: 1 },
				{ id: 'y', score: 1 }
			],
			[
				{ id: 'y', score: 1 },
				{ id: 'x', score: 1 }
			]
		]);
		expect(out.map((f) => f.id)).toEqual(['x', 'y']);
	});

	it('handles empty input', () => {
		expect(rrf([[], []])).toEqual([]);
	});
});

describe('linear', () => {
	it('min-max normalizes each list before blending', () => {
		const out = linear(
			[
				[
					{ id: 'a', score: 100 },
					{ id: 'b', score: 50 }
				],
				[
					{ id: 'b', score: 0.9 },
					{ id: 'a', score: 0.1 }
				]
			],
			0.5
		);
		expect(out[0].score).toBeCloseTo(0.5);
		expect(out[1].score).toBeCloseTo(0.5);
	});
});

describe('mmr', () => {
	it('prefers a diverse item over a near-duplicate of a picked one', () => {
		const items = [
			{ id: 'a', rel: 1, group: 1 },
			{ id: 'a2', rel: 0.95, group: 1 },
			{ id: 'b', rel: 0.8, group: 2 }
		];
		const picked = mmr(
			items,
			(t) => t.rel,
			(x, y) => (x.group === y.group ? 1 : 0),
			2,
			0.7
		);
		expect(picked.map((p) => p.id)).toEqual(['a', 'b']);
	});
});
