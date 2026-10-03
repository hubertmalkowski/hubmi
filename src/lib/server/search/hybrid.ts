// Hybrid retrieval over the innovations index: Polish BM25 and dense kNN run in
// parallel, fused in application code (ES rrf/linear retrievers need Enterprise).
import type { estypes } from '@elastic/elasticsearch';
import { es } from './es';
import { INDEX } from './indices';
import { rrf, linear, type Fused } from './rrf';
import { embedOne } from '../ai/embed';
import type { Highlights } from '../db/schema';

export type InnovationDoc = {
	slug: string;
	title: string;
	summary: string;
	area_slug: string;
	target_groups: string[];
	stage: string;
};

export type HybridHit = Fused & {
	doc: InnovationDoc;
	bm25Rank?: number;
	knnRank?: number;
	highlights: Highlights;
};

export type HybridOptions = {
	text: string;
	/** pre-computed query vector; embedded from `text` when absent */
	vector?: number[];
	area?: { slug: string; confidence: number };
	targetGroups?: string[];
	filters?: { area?: string; group?: string; stage?: string };
	size?: number;
	depth?: number;
	fusion?: 'rrf' | 'linear';
	mode?: 'hybrid' | 'bm25' | 'knn';
};

const SOURCE = ['slug', 'title', 'summary', 'area_slug', 'target_groups', 'stage'];

function filterClauses(f: HybridOptions['filters']): estypes.QueryDslQueryContainer[] {
	const out: estypes.QueryDslQueryContainer[] = [{ term: { status: 'published' } }];
	if (f?.area) out.push({ term: { area_slug: f.area } });
	if (f?.group) out.push({ term: { target_groups: f.group } });
	if (f?.stage) out.push({ term: { stage: f.stage } });
	return out;
}

export async function hybridSearch(opts: HybridOptions): Promise<HybridHit[]> {
	const depth = opts.depth ?? 50;
	const mode = opts.mode ?? 'hybrid';
	const filter = filterClauses(opts.filters);

	const should: estypes.QueryDslQueryContainer[] = [
		// light prior: implemented innovations are proven
		{ term: { stage: { value: 'implemented', boost: 0.3 } } }
	];
	if (opts.area && opts.area.confidence >= 0.7 && opts.area.slug !== 'other') {
		should.push({ term: { area_slug: { value: opts.area.slug, boost: 1.5 } } });
	}
	if (opts.targetGroups?.length) {
		should.push({ terms: { target_groups: opts.targetGroups, boost: 1.2 } });
	}

	const bm25 =
		mode === 'knn' || !opts.text.trim()
			? Promise.resolve(undefined)
			: es.search<InnovationDoc>({
					index: INDEX.innovations,
					size: depth,
					_source: SOURCE,
					query: {
						bool: {
							must: [
								{
									multi_match: {
										query: opts.text,
										type: 'best_fields',
										fields: ['title^3', 'title.folded^1.5', 'summary^2', 'description', 'implementation_notes^0.5'],
										tie_breaker: 0.3
									}
								}
							],
							should,
							filter
						}
					},
					highlight: {
						pre_tags: ['<mark>'],
						post_tags: ['</mark>'],
						fields: {
							title: { number_of_fragments: 0 },
							summary: { number_of_fragments: 0 },
							description: { fragment_size: 120, number_of_fragments: 2 }
						}
					}
				});

	const vector = mode === 'bm25' ? undefined : (opts.vector ?? (await embedOne(opts.text, 'query')));
	const knn = vector
		? es.search<InnovationDoc>({
				index: INDEX.innovations,
				size: depth,
				_source: SOURCE,
				knn: { field: 'embedding', query_vector: vector, k: depth, num_candidates: Math.max(200, depth * 4), filter }
			})
		: Promise.resolve(undefined);

	const [b, k] = await Promise.all([bm25, knn]);
	const docs = new Map<string, InnovationDoc>();
	const hl = new Map<string, Highlights>();
	const toRanked = (r: estypes.SearchResponse<InnovationDoc> | undefined) =>
		(r?.hits.hits ?? []).flatMap((h) => {
			if (!h._id || !h._source) return [];
			docs.set(h._id, h._source);
			if (h.highlight) hl.set(h._id, h.highlight as Highlights);
			return [{ id: h._id, score: h._score ?? 0 }];
		});
	const bl = toRanked(b);
	const kl = toRanked(k);

	const fused = opts.fusion === 'linear' ? linear([bl, kl], 0.5) : rrf([bl, kl]);
	return fused.slice(0, opts.size ?? 20).map((f) => ({
		...f,
		doc: docs.get(f.id)!,
		bm25Rank: f.ranks[0],
		knnRank: f.ranks[1],
		highlights: hl.get(f.id) ?? {}
	}));
}
