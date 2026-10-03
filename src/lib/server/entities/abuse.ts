// Cheap lexical screen for profanity, slurs and threats in reported needs. It only has to
// raise suspicion: a hit sends the need to human moderation, it never rejects anything.
// Stems match at the start of a word, after folding case, Polish diacritics and leetspeak;
// masked letters ("k*rwa", "ch#j") match too.

export type AbuseKind = 'profanity' | 'threat';
export type AbuseHit = { kind: AbuseKind; match: string };

// Word-start stems on folded text (ł → l, no diacritics). Kept narrow to avoid flagging
// ordinary words: e.g. "ciota" but not "ciotka", "cipa" but not "cipka" in other senses.
const PROFANITY = [
	// Polish
	'kurw',
	'skurw',
	'wkurw',
	'chuj',
	'huj',
	'pierdol',
	'pierdal',
	'spierd',
	'wypierd',
	'jeba',
	'jebi',
	'jebn',
	'zjeb',
	'wyjeb',
	'pizd',
	'cipa',
	'cipy',
	'dziwk',
	'gowno',
	'gowna',
	'debil',
	'kretyn',
	'idiot',
	'cwel',
	'ciota',
	'ciote',
	// English
	'fuck',
	'shit',
	'cunt',
	'bitch',
	// Ukrainian (Cyrillic is not folded beyond lower case)
	'хуй',
	'хуя',
	'пизд',
	'бляд',
	'єба',
	'їба',
	'ебат'
];

const THREAT = [
	'zabij',
	'zabic',
	'pozabij',
	'zamorduj',
	'zastrzel',
	'wysadz',
	'kill',
	'вбю',
	'вбʼю',
	'вбити'
];

const LEET: Record<string, string> = {
	'0': 'o',
	'1': 'i',
	'3': 'e',
	'4': 'a',
	'5': 's',
	'@': 'a',
	$: 's'
};

function fold(text: string): string {
	return text
		.toLocaleLowerCase('pl')
		.replace(/ł/g, 'l')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[0134@$5]/g, (c) => LEET[c] ?? c);
}

/** Stem as a regex where any letter may be masked with * or #. */
const masked = (stem: string) =>
	[...stem].map((c) => `[${c.replace(/[\\\]^-]/g, '\\$&')}*#]`).join('');

const pattern = (stems: string[]) =>
	new RegExp(`(?<![\\p{L}])(?:${stems.map(masked).join('|')})[\\p{L}*#]*`, 'giu');

const PATTERNS: [AbuseKind, RegExp][] = [
	['profanity', pattern(PROFANITY)],
	['threat', pattern(THREAT)]
];

export function findAbuse(text: string): AbuseHit[] {
	const folded = fold(text);
	return PATTERNS.flatMap(([kind, re]) =>
		[...folded.matchAll(re)].map((m) => ({ kind, match: m[0] }))
	);
}
