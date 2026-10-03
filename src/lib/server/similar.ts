import { es } from './search/es';
import { INDEX } from './search/indices';
import { POLICY } from './match/policy';

/** Similar needs reported in other gminas (aggregated: count + powiats only). */
export async function similarNeeds(need: {
	id: string;
	embedding: number[] | null;
	placeTeryt: string | null;
}) {
	if (!need.embedding?.length) return { count: 0, powiats: [] as string[] };
	try {
		const res = await es.search<{ powiat_teryt?: string; place_teryt?: string }>({
			index: INDEX.needs,
			size: 10,
			knn: {
				field: 'embedding',
				query_vector: need.embedding,
				k: 10,
				num_candidates: 100,
				similarity: POLICY.similarNeedsMinCosine,
				filter: need.placeTeryt
					? { bool: { must_not: [{ term: { place_teryt: need.placeTeryt } }] } }
					: undefined
			},
			_source: ['powiat_teryt', 'place_teryt']
		});
		const hits = res.hits.hits.filter((h) => h._id !== need.id);
		const powiats = [
			...new Set(hits.map((h) => h._source?.powiat_teryt).filter((p): p is string => !!p))
		];
		const gminas = new Set(hits.map((h) => h._source?.place_teryt).filter(Boolean));
		return { count: gminas.size, powiats };
	} catch {
		return { count: 0, powiats: [] as string[] };
	}
}
