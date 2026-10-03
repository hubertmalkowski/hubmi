// Elasticsearch index definitions. Each logical index is an alias pointing at a
// versioned physical index, so scripts/es-reindex.ts can rebuild without downtime.
import type { estypes } from '@elastic/elasticsearch';
import { readFileSync, existsSync } from 'node:fs';
import { es } from './es';
import { env } from '../env';

export const INDEX = {
	innovations: 'innovations',
	needs: 'needs',
	places: 'places',
	challenges: 'challenges'
} as const;
export type IndexName = (typeof INDEX)[keyof typeof INDEX];

function synonyms(): string[] {
	const path = 'data/seed/synonyms.txt';
	if (!existsSync(path)) return [];
	return readFileSync(path, 'utf8')
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l && !l.startsWith('#'));
}

/**
 * Polish analysis. `pl_hunspell` lemmatizes with the dictionary-pl hunspell files baked
 * into the ES image ("seniorów" -> "senior", "Nowym Targu" -> "nowy targ").
 * Synonyms are applied at search time only, so the list can change without reindexing.
 */
export function analysisSettings(): estypes.IndicesIndexSettings {
	return {
		analysis: {
			filter: {
				pl_stop: { type: 'stop', stopwords: polishStopwords },
				pl_hunspell: {
					type: 'hunspell',
					locale: 'pl_PL',
					lang: 'pl_PL',
					language: 'pl_PL',
					dedup: true
				},
				pl_synonyms: { type: 'synonym_graph', synonyms: synonyms(), lenient: true }
			},
			analyzer: {
				pl_index: {
					type: 'custom',
					tokenizer: 'standard',
					filter: ['lowercase', 'pl_stop', 'pl_hunspell']
				},
				pl_search: {
					type: 'custom',
					tokenizer: 'standard',
					filter: ['lowercase', 'pl_synonyms', 'pl_stop', 'pl_hunspell']
				},
				folded: { type: 'custom', tokenizer: 'standard', filter: ['lowercase', 'asciifolding'] }
			}
		}
	};
}

const plText = (extra: Record<string, estypes.MappingProperty> = {}): estypes.MappingProperty => ({
	type: 'text',
	analyzer: 'pl_index',
	search_analyzer: 'pl_search',
	fields: { folded: { type: 'text', analyzer: 'folded' }, ...extra }
});

const vector = (): estypes.MappingProperty => ({
	type: 'dense_vector',
	dims: env.embeddingDims,
	index: true,
	similarity: 'cosine',
	index_options: { type: 'int8_hnsw' }
});

export const mappings: Record<IndexName, estypes.MappingTypeMapping> = {
	innovations: {
		dynamic: 'strict',
		properties: {
			slug: { type: 'keyword' },
			title: plText(),
			summary: plText(),
			description: plText(),
			implementation_notes: plText(),
			area_slug: { type: 'keyword' },
			target_groups: { type: 'keyword' },
			stage: { type: 'keyword' },
			status: { type: 'keyword' },
			embedding: vector(),
			updated_at: { type: 'date' }
		}
	},
	needs: {
		dynamic: 'strict',
		properties: {
			redacted_text: plText(),
			area_slug: { type: 'keyword' },
			place_teryt: { type: 'keyword' },
			powiat_teryt: { type: 'keyword' },
			status: { type: 'keyword' },
			embedding: vector(),
			created_at: { type: 'date' }
		}
	},
	places: {
		dynamic: 'strict',
		properties: {
			teryt: { type: 'keyword' },
			name: plText({ keyword: { type: 'keyword' } }),
			aliases: plText(),
			kind: { type: 'keyword' },
			powiat: { type: 'keyword' },
			powiat_teryt: { type: 'keyword' }
		}
	},
	challenges: {
		dynamic: 'strict',
		properties: {
			title: plText(),
			description: plText(),
			area_slug: { type: 'keyword' },
			open: { type: 'boolean' },
			embedding: vector(),
			need_count: { type: 'integer' }
		}
	}
};

/** Create `<alias>-v<version>` and point the alias at it. Returns the physical index name. */
export async function createVersionedIndex(alias: IndexName, version: number) {
	const name = `${alias}-v${version}`;
	if (!(await es.indices.exists({ index: name }))) {
		await es.indices.create({
			index: name,
			settings: { ...analysisSettings(), number_of_shards: 1, number_of_replicas: 0 },
			mappings: mappings[alias]
		});
	}
	return name;
}

export async function pointAlias(alias: IndexName, index: string) {
	const current = (await es.indices.existsAlias({ name: alias }))
		? Object.keys(await es.indices.getAlias({ name: alias }))
		: [];
	await es.indices.updateAliases({
		actions: [
			...current.filter((i) => i !== index).map((i) => ({ remove: { index: i, alias } })),
			{ add: { index, alias } }
		]
	});
	return current.filter((i) => i !== index);
}

/** Ensure every alias exists (version 1 on a fresh cluster). */
export async function ensureIndices() {
	for (const alias of Object.values(INDEX)) {
		if (await es.indices.existsAlias({ name: alias })) continue;
		const index = await createVersionedIndex(alias, 1);
		await pointAlias(alias, index);
	}
}

// Polish stopword list (the `_polish_` set ships only with the Stempel plugin).
const polishStopwords = [
	'a',
	'aby',
	'ach',
	'acz',
	'aczkolwiek',
	'aj',
	'albo',
	'ale',
	'ależ',
	'ani',
	'aż',
	'bardziej',
	'bardzo',
	'bo',
	'bowiem',
	'by',
	'byli',
	'bynajmniej',
	'być',
	'był',
	'była',
	'było',
	'były',
	'będzie',
	'będą',
	'cali',
	'cała',
	'cały',
	'ci',
	'cię',
	'ciebie',
	'co',
	'cokolwiek',
	'coś',
	'czasami',
	'czasem',
	'czemu',
	'czy',
	'czyli',
	'daleko',
	'dla',
	'dlaczego',
	'dlatego',
	'do',
	'dobrze',
	'dokąd',
	'dość',
	'dużo',
	'dwa',
	'dwaj',
	'dwie',
	'dwoje',
	'dziś',
	'dzisiaj',
	'gdy',
	'gdyby',
	'gdyż',
	'gdzie',
	'gdziekolwiek',
	'gdzieś',
	'i',
	'ich',
	'ile',
	'im',
	'inna',
	'inne',
	'inny',
	'innych',
	'iż',
	'ja',
	'ją',
	'jak',
	'jakaś',
	'jakby',
	'jaki',
	'jakichś',
	'jakie',
	'jakiś',
	'jakiż',
	'jakkolwiek',
	'jako',
	'jakoś',
	'je',
	'jeden',
	'jedna',
	'jedno',
	'jednak',
	'jednakże',
	'jego',
	'jej',
	'jemu',
	'jest',
	'jestem',
	'jeszcze',
	'jeśli',
	'jeżeli',
	'już',
	'ją',
	'każdy',
	'kiedy',
	'kilka',
	'kimś',
	'kto',
	'ktokolwiek',
	'ktoś',
	'która',
	'które',
	'którego',
	'której',
	'który',
	'których',
	'którym',
	'którzy',
	'ku',
	'lat',
	'lecz',
	'lub',
	'ma',
	'mają',
	'mało',
	'mam',
	'mi',
	'mimo',
	'między',
	'mną',
	'mnie',
	'mogą',
	'moi',
	'moim',
	'moja',
	'moje',
	'może',
	'możliwe',
	'można',
	'mój',
	'mu',
	'musi',
	'my',
	'na',
	'nad',
	'nam',
	'nami',
	'nas',
	'nasi',
	'nasz',
	'nasza',
	'nasze',
	'naszego',
	'naszych',
	'natomiast',
	'natychmiast',
	'nawet',
	'nią',
	'nic',
	'nich',
	'nie',
	'niech',
	'niego',
	'niej',
	'niemu',
	'nigdy',
	'nim',
	'nimi',
	'niż',
	'no',
	'o',
	'obok',
	'od',
	'około',
	'on',
	'ona',
	'one',
	'oni',
	'ono',
	'oraz',
	'oto',
	'owszem',
	'pan',
	'pana',
	'pani',
	'po',
	'pod',
	'podczas',
	'pomimo',
	'ponad',
	'ponieważ',
	'powinien',
	'powinna',
	'powinni',
	'powinno',
	'poza',
	'prawie',
	'przecież',
	'przed',
	'przede',
	'przedtem',
	'przez',
	'przy',
	'roku',
	'również',
	'sam',
	'sama',
	'są',
	'się',
	'skąd',
	'sobie',
	'sobą',
	'sposób',
	'swoje',
	'ta',
	'tak',
	'taka',
	'taki',
	'takie',
	'także',
	'tam',
	'te',
	'tego',
	'tej',
	'temu',
	'ten',
	'teraz',
	'też',
	'to',
	'tobą',
	'tobie',
	'toteż',
	'trzeba',
	'tu',
	'tutaj',
	'twoi',
	'twoim',
	'twoja',
	'twoje',
	'twym',
	'twój',
	'ty',
	'tych',
	'tylko',
	'tym',
	'u',
	'w',
	'wam',
	'wami',
	'was',
	'wasz',
	'wasza',
	'wasze',
	'we',
	'według',
	'wiele',
	'wielu',
	'więc',
	'więcej',
	'wszyscy',
	'wszystkich',
	'wszystkie',
	'wszystkim',
	'wszystko',
	'wtedy',
	'wy',
	'właśnie',
	'z',
	'za',
	'zapewne',
	'zawsze',
	'ze',
	'znowu',
	'znów',
	'został',
	'żaden',
	'żadna',
	'żadne',
	'żadnych',
	'że',
	'żeby'
];
