// Rank fusion for hybrid retrieval. RRF is the default: rank-based, so BM25 and
// cosine scores never need normalizing. The linear blend is kept for comparison in
// scripts/eval-match.ts once labelled data exists.

export type Ranked = { id: string; score: number };

export type Fused = {
	id: string;
	score: number;
	/** 1-based rank per input list, undefined when the list did not return the doc. */
	ranks: (number | undefined)[];
};

export const RRF_K = 60;

export function rrf(lists: Ranked[][], k = RRF_K): Fused[] {
	const acc = new Map<string, Fused>();
	lists.forEach((list, li) => {
		list.forEach((item, i) => {
			const rank = i + 1;
			const f = acc.get(item.id) ?? { id: item.id, score: 0, ranks: lists.map(() => undefined) };
			f.score += 1 / (k + rank);
			f.ranks[li] = rank;
			acc.set(item.id, f);
		});
	});
	return sortFused([...acc.values()]);
}

/** Min-max normalized convex combination: alpha weights the first list. */
export function linear(lists: [Ranked[], Ranked[]], alpha = 0.5): Fused[] {
	const norm = (list: Ranked[]) => {
		if (!list.length) return new Map<string, number>();
		const max = Math.max(...list.map((x) => x.score));
		const min = Math.min(...list.map((x) => x.score));
		const span = max - min || 1;
		return new Map(list.map((x) => [x.id, (x.score - min) / span]));
	};
	const [a, b] = [norm(lists[0]), norm(lists[1])];
	const ids = new Set([...a.keys(), ...b.keys()]);
	const rankOf = (list: Ranked[], id: string) => {
		const i = list.findIndex((x) => x.id === id);
		return i === -1 ? undefined : i + 1;
	};
	return sortFused(
		[...ids].map((id) => ({
			id,
			score: alpha * (a.get(id) ?? 0) + (1 - alpha) * (b.get(id) ?? 0),
			ranks: [rankOf(lists[0], id), rankOf(lists[1], id)]
		}))
	);
}

function sortFused(xs: Fused[]): Fused[] {
	// Ties: the document with the better best-rank wins, then id for determinism.
	const best = (f: Fused) => Math.min(...f.ranks.map((r) => r ?? Infinity));
	return xs.sort((x, y) => y.score - x.score || best(x) - best(y) || x.id.localeCompare(y.id));
}

/**
 * Maximal marginal relevance over a relevance-ordered list, so near-duplicates don't
 * crowd the final results. `sim` returns similarity between two items in 0..1.
 */
export function mmr<T>(items: T[], relevance: (t: T) => number, sim: (a: T, b: T) => number, k: number, lambda = 0.7): T[] {
	const picked: T[] = [];
	const pool = [...items];
	while (picked.length < k && pool.length) {
		let bestI = 0;
		let bestV = -Infinity;
		pool.forEach((t, i) => {
			const red = picked.length ? Math.max(...picked.map((p) => sim(t, p))) : 0;
			const v = lambda * relevance(t) - (1 - lambda) * red;
			if (v > bestV) {
				bestV = v;
				bestI = i;
			}
		});
		picked.push(pool.splice(bestI, 1)[0]);
	}
	return picked;
}
