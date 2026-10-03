// Jev question catalog. Instructions and criteria are English (Jev is primarily
// English); state carries the user's original text. Question IDs are for code only.
import { choice, noul, score } from '@typesafe-ai/sdk';

export type AreaDef = { slug: string; descriptionEn: string };
export type GroupDef = { slug: string; descriptionEn: string };

export const MATCH_FIT_LEVELS = [
	'Unrelated: addresses a different problem or a different group.',
	'Same broad area, but would not solve this problem.',
	'Partially helps: addresses one aspect or needs major adaptation.',
	'Good fit: addresses the core problem for this group with modest adaptation.',
	'Direct fit: designed for exactly this problem and group.'
] as const;

export const URGENCY_LEVELS = [
	'No time pressure; a general improvement.',
	'Ongoing difficulty affecting daily life.',
	'Serious harm likely within weeks without help.',
	"Immediate risk to someone's health or safety."
] as const;

/** Intake classification over state `{ text, places? }`. */
export function intakeQuestions(areas: AreaDef[], groups: GroupDef[], placeCandidates: string[]) {
	const qs = {
		area: choice(
			'Which social challenge area is the main problem in `text` about?',
			Object.fromEntries(areas.map((a) => [a.slug, a.descriptionEn]))
		),
		urgency: score('How urgent is the situation described in `text`?', URGENCY_LEVELS),
		is_need: noul(
			'Does `text` describe a social problem or need affecting people, rather than spam, a test or an unrelated request?'
		),
		pii_any: noul(
			'Does `text` contain personal data of a private individual, such as a full name, phone number, email, ID number or home address?'
		),
		...Object.fromEntries(
			groups.map((g) => [`tg_${g.slug}`, noul(`Are ${g.descriptionEn} among the people affected by the problem in \`text\`?`)])
		)
	} as Record<string, ReturnType<typeof noul> | ReturnType<typeof choice> | ReturnType<typeof score>>;
	if (placeCandidates.length) {
		qs.place = choice(
			'Which place is where the problem described in `text` occurs?',
			Object.fromEntries([
				...placeCandidates.map((desc, i) => [`p${i + 1}`, desc]),
				['none', 'No place is stated, or the places are only mentioned incidentally.']
			])
		);
	}
	return qs;
}

/** One Score question per candidate over state `{ need, candidates: { c1: … } }`. */
export function matchFitQuestions(candidateKeys: string[]) {
	return Object.fromEntries(
		candidateKeys.map((k) => [
			`fit_${k}`,
			score(
				`How well would the social innovation \`candidates.${k}\` address the problem described in \`need.text\` for the people affected, if implemented locally?`,
				MATCH_FIT_LEVELS
			)
		])
	);
}

/** Over state `{ need: { text }, challenges: { c1: { title, description } } }`. */
export function sameChallengeQuestions(keys: string[]) {
	return Object.fromEntries(
		keys.map((k) => [
			`same_${k}`,
			noul(
				`Does \`need.text\` describe essentially the same unmet problem as \`challenges.${k}.description\`?`
			)
		])
	);
}

/** Over state `{ text, candidates: { n1: "Jan Kowalski" } }`. */
export function personNameQuestions(keys: string[]) {
	return Object.fromEntries(
		keys.map((k) => [`name_${k}`, noul(`Is \`candidates.${k}\` the name of a private person in \`text\`?`)])
	);
}

/** Over state `{ idea: { title, essence, for_whom, how_it_works, stage } }`. */
export const completenessQuestions = {
	has_problem: noul('Does `idea` clearly state the social problem it solves?'),
	has_beneficiary: noul('Does `idea` say who exactly will benefit from it?'),
	has_mechanism: noul('Does `idea` explain how the solution works in practice?'),
	has_novelty: noul('Does `idea` say what is new or different compared with existing services?'),
	has_stage_evidence: noul('Does `idea` describe what has already been done or tested, if anything?')
};

/** Over state `{ item: { title, text } }`. */
export function triageQuestions(expertTags: Record<string, string>) {
	return {
		expert: choice('Which expert area best fits `item`?', {
			...expertTags,
			none: 'None of these areas fits.'
		}),
		priority: score('How much priority should the hub team give `item`?', [
			'Routine: can wait for the regular review cycle.',
			'Normal: should be reviewed this week.',
			'High: affects many people or a vulnerable group.',
			'Urgent: risk to health or safety, or a deadline within days.'
		])
	};
}

export const FEEDBACK_CATEGORIES = {
	bug: 'Something does not work or breaks.',
	usability: 'It works but is hard or confusing to use.',
	accessibility: 'A barrier for people with disabilities, older people or low digital skills.',
	idea: 'A suggestion for a new feature or improvement.',
	praise: 'Positive feedback without a requested change.',
	other: 'None of the above.'
} as const;

/** Over state `{ feedback: { rating, text } }`. */
export const feedbackQuestions = {
	category: choice('What kind of feedback is `feedback`?', FEEDBACK_CATEGORIES),
	actionable: noul('Does `feedback` contain a concrete change the innovator could make?')
};
