// Location entity linking. Candidates come from a gazetteer match: the text and every
// gmina name (plus aliases) are run through the same Elasticsearch Polish analyzer
// (hunspell lemmas + diacritic folding). A place is a candidate only if every token of its
// name matches a text token, by lemma or by a shared stem prefix (catches inflections the
// dictionary lacks: "w Zawoi" → Zawoja, "w Sączu" → Sącz). The decision model then picks
// the place where the problem occurs, or none.
import { db } from '../db';
import { places } from '../db/schema';
import { es } from '../search/es';
import { INDEX } from '../search/indices';
import { fold } from '../ai/text';

export type PlaceCandidate = { teryt: string; name: string; powiat: string; kind: string };

const KIND_PL: Record<string, string> = {
	urban: 'gmina miejska',
	rural: 'gmina wiejska',
	urban_rural: 'gmina miejsko-wiejska'
};

type Entry = { place: PlaceCandidate; names: string[][] };
let gazetteer: Promise<Entry[]> | undefined;

/** Folded word tokens (same result as the `folded` analyzer: lowercase + ASCII folding). */
function foldTokens(text: string): string[] {
	return fold(text)
		.split(/[^\p{L}\p{N}]+/u)
		.filter(Boolean);
}

/** Text tokens: hunspell lemmas from Elasticsearch plus the folded surface forms. */
async function analyze(text: string): Promise<string[]> {
	const lemmas = await es.indices.analyze({ index: INDEX.places, analyzer: 'pl_index', text });
	return [...new Set([...(lemmas.tokens ?? []).map((t) => fold(t.token)), ...foldTokens(text)])];
}

function loadGazetteer() {
	gazetteer ??= (async () => {
		const rows = await db.select().from(places);
		return rows.map((p) => ({
			place: { teryt: p.teryt, name: p.name, powiat: p.powiat, kind: p.kind },
			names: [p.name, ...p.aliases].map(foldTokens)
		}));
	})().catch((e) => {
		gazetteer = undefined;
		throw e;
	});
	return gazetteer;
}

/**
 * Name token vs text token: equal, or an inflected form. Polish inflection changes the end
 * of a word: the name may lose at most 2 trailing letters ("Zawoja" → "Zawoi"), and the text
 * word may add up to 4 letters when the full name is kept ("Tarnów" → "Tarnowie") or 2
 * otherwise. "Kościelec" vs "Kościeliska" differs too much at the end and is rejected.
 */
export function tokenMatches(nameTok: string, textTok: string): boolean {
	if (nameTok === textTok) return true;
	if (nameTok.length < 4 || textTok.length < 3) return false;
	let lcp = 0;
	while (lcp < nameTok.length && lcp < textTok.length && nameTok[lcp] === textTok[lcp]) lcp++;
	const nameRest = nameTok.length - lcp;
	const textRest = textTok.length - lcp;
	if (lcp < 3 || nameRest > 2) return false;
	return textRest <= (nameRest === 0 ? 4 : 2);
}

export function nameMatches(nameTokens: string[], textTokens: string[]): boolean {
	return (
		nameTokens.length > 0 && nameTokens.every((n) => textTokens.some((t) => tokenMatches(n, t)))
	);
}

export async function placeCandidates(text: string, max = 5): Promise<PlaceCandidate[]> {
	try {
		const [entries, tokens] = await Promise.all([loadGazetteer(), analyze(text)]);
		const hits = entries
			.map((e) => ({
				e,
				len: Math.max(0, ...e.names.filter((n) => nameMatches(n, tokens)).map((n) => n.length))
			}))
			.filter((x) => x.len > 0)
			// prefer longer (more specific) names: "Nowy Targ" before a one-word partial match
			.sort((a, b) => b.len - a.len);
		return hits.slice(0, max).map((x) => x.e.place);
	} catch (e) {
		console.warn('[places] lookup failed', (e as Error).message);
		return [];
	}
}

export function describePlace(p: PlaceCandidate) {
	return `${p.name}, ${KIND_PL[p.kind] ?? 'gmina'}, powiat ${p.powiat}`;
}

/** Drop the cached gazetteer (after places are re-imported). */
export function resetGazetteer() {
	gazetteer = undefined;
}
