// Location entity linking: Elasticsearch finds gmina candidates in the text (hunspell
// handles inflection such as "w Nowym Targu"), the decision model picks the place where
// the problem occurs, or none.
import { es } from '../search/es';
import { INDEX } from '../search/indices';

export type PlaceCandidate = { teryt: string; name: string; powiat: string; kind: string };

const KIND_PL: Record<string, string> = {
	urban: 'gmina miejska',
	rural: 'gmina wiejska',
	urban_rural: 'gmina miejsko-wiejska'
};

export async function placeCandidates(text: string, max = 5): Promise<PlaceCandidate[]> {
	try {
		const res = await es.search<{ teryt: string; name: string; powiat: string; kind: string }>({
			index: INDEX.places,
			size: max,
			query: {
				multi_match: {
					query: text,
					fields: ['name^2', 'name.folded', 'aliases', 'aliases.folded'],
					type: 'best_fields',
					minimum_should_match: '1'
				}
			},
			min_score: 2.5,
			_source: ['teryt', 'name', 'powiat', 'kind']
		});
		return res.hits.hits.flatMap((h) => (h._source ? [h._source] : []));
	} catch (e) {
		console.warn('[places] lookup failed', (e as Error).message);
		return [];
	}
}

export function describePlace(p: PlaceCandidate) {
	return `${p.name}, ${KIND_PL[p.kind] ?? 'gmina'}, powiat ${p.powiat}`;
}
