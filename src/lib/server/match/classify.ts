// Intake: one decision request answers area, target groups, urgency, is-need,
// personal data and (when the gazetteer finds candidates) the place, in parallel.
import { decisions, pAtLeast } from '../ai/decision';
import { intakeQuestions, personNameQuestions } from '../ai/questions';
import { taxonomy } from '../taxonomy';
import { placeCandidates, describePlace, type PlaceCandidate } from '../entities/places';
import { findPii, redact, type PiiSpan } from '../entities/pii';

export type Classification = {
	area: { slug: string; p: number; confidence: number };
	targetGroups: { slug: string; p: number }[];
	urgency: number;
	pUrgent: number;
	isNeed: number;
	pii: number;
	place?: { teryt: string; name: string; powiat: string; confidence: number };
	placeCandidates: PlaceCandidate[];
};

export const TARGET_GROUP_THRESHOLD = 0.6;
export const PLACE_CONFIDENCE = 0.5;

export async function classifyNeed(text: string): Promise<Classification> {
	const [{ areas, groups }, candidates] = await Promise.all([taxonomy(), placeCandidates(text)]);
	const qs = intakeQuestions(
		areas.map((a) => ({ slug: a.slug, descriptionEn: a.descriptionEn })),
		groups.map((g) => ({ slug: g.slug, descriptionEn: g.descriptionEn })),
		candidates.map(describePlace)
	);
	const a = (await decisions().ask('intake.classify', { text }, qs)) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

	let place: Classification['place'];
	if (a.place && a.place.choice !== 'none' && a.place.confidence >= PLACE_CONFIDENCE) {
		const c = candidates[Number(String(a.place.choice).slice(1)) - 1];
		if (c) place = { teryt: c.teryt, name: c.name, powiat: c.powiat, confidence: a.place.confidence };
	}

	return {
		area: { slug: a.area.choice, p: a.area.probabilities[a.area.choice], confidence: a.area.confidence },
		targetGroups: groups
			.map((g) => ({ slug: g.slug, p: a[`tg_${g.slug}`]?.noul ?? 0 }))
			.sort((x, y) => y.p - x.p),
		urgency: a.urgency.score,
		pUrgent: pAtLeast(a.urgency.probabilities, 2),
		isNeed: a.is_need.noul,
		pii: a.pii_any.noul,
		place,
		placeCandidates: candidates
	};
}

export type Redaction = { text: string; spans: PiiSpan[] };

/**
 * Regex PII is redacted directly; first-name candidates are confirmed with one Noul each
 * (the decision model sees the raw text in order to redact it).
 */
export async function redactPii(text: string): Promise<Redaction> {
	const found = findPii(text);
	const names = found.filter((s) => s.kind === 'name');
	let confirmed = found.filter((s) => s.kind !== 'name');
	if (names.length) {
		const keys = names.map((_, i) => `n${i + 1}`);
		const ans = (await decisions().ask(
			'pii.names',
			{ text, candidates: Object.fromEntries(names.map((n, i) => [keys[i], n.text])) },
			personNameQuestions(keys)
		)) as Record<string, { noul: number }>;
		confirmed = confirmed.concat(names.filter((_, i) => (ans[`name_${keys[i]}`]?.noul ?? 0) >= 0.5));
	}
	return { text: redact(text, confirmed), spans: confirmed };
}
