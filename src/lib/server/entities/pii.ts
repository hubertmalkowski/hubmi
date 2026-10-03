// Personal data detection and redaction. Regexes find structured identifiers;
// person names come from a first-name gazetteer (with Polish inflection endings)
// and are confirmed by a Noul judgment per candidate before redaction.
import firstNamesJson from '../../../../data/seed/first_names.json';
import { fold } from '../ai/text';

export type PiiKind = 'pesel' | 'phone' | 'email' | 'postcode' | 'address' | 'name';
export type PiiSpan = { kind: PiiKind; start: number; end: number; text: string };

export const PII_PLACEHOLDER: Record<PiiKind, string> = {
	pesel: '[PESEL]',
	phone: '[telefon]',
	email: '[e-mail]',
	postcode: '[kod pocztowy]',
	address: '[adres]',
	name: '[osoba]'
};

export function validPesel(digits: string): boolean {
	if (!/^\d{11}$/.test(digits)) return false;
	const w = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
	const sum = w.reduce((s, wi, i) => s + wi * Number(digits[i]), 0);
	return (10 - (sum % 10)) % 10 === Number(digits[10]);
}

const UPPER = 'A-ZĄĆĘŁŃÓŚŹŻ';
const WORD = `[${UPPER}][\\p{Ll}-]+`;

const PATTERNS: Array<{ kind: PiiKind; re: RegExp; check?: (m: string) => boolean }> = [
	{ kind: 'email', re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g },
	{ kind: 'pesel', re: /\b\d{11}\b/g, check: validPesel },
	{ kind: 'phone', re: /(?:\+48[\s-]?)?\b\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/g },
	{ kind: 'postcode', re: /\b\d{2}-\d{3}\b/g },
	{
		kind: 'address',
		re: new RegExp(
			`\\b(?:ul\\.|ulica|ulicy|al\\.|aleja|alei|os\\.|osiedle|pl\\.)\\s*${WORD}(?:\\s+${WORD})?\\s+\\d+[a-zA-Z]?(?:\\/\\d+)?`,
			'gu'
		)
	}
];

const FIRST_NAMES = new Set((firstNamesJson as string[]).map((n) => fold(n)));
// Polish case endings that turn a nominative first name into an inflected form.
const ENDINGS = ['', 'a', 'y', 'i', 'owi', 'em', 'ie', 'u', 'ą', 'ę', 'ego', 'emu', 'ej'];

export function isFirstName(token: string): boolean {
	const t = fold(token);
	for (const e of ENDINGS) {
		if (e && !t.endsWith(fold(e))) continue;
		const base = e ? t.slice(0, -fold(e).length) : t;
		if (FIRST_NAMES.has(base) || FIRST_NAMES.has(base + 'a') || FIRST_NAMES.has(base + 'ek')) return true;
	}
	return false;
}

/** Structured PII found by regex, plus name candidates (unverified). */
export function findPii(text: string): PiiSpan[] {
	const spans: PiiSpan[] = [];
	for (const { kind, re, check } of PATTERNS) {
		for (const m of text.matchAll(re)) {
			const raw = m[0];
			if (check && !check(raw)) continue;
			const start = m.index ?? 0;
			if (spans.some((s) => start < s.end && start + raw.length > s.start)) continue;
			spans.push({ kind, start, end: start + raw.length, text: raw });
		}
	}
	return spans.concat(nameCandidates(text, spans)).sort((a, b) => a.start - b.start);
}

/** "Jan Kowalski", "Marii Wiśniewskiej": a first name followed by a capitalized surname. */
export function nameCandidates(text: string, taken: PiiSpan[] = []): PiiSpan[] {
	const re = new RegExp(`(${WORD})\\s+(${WORD}(?:-${WORD})?)`, 'gu');
	const out: PiiSpan[] = [];
	for (const m of text.matchAll(re)) {
		const start = m.index ?? 0;
		const end = start + m[0].length;
		if (taken.some((s) => start < s.end && end > s.start)) continue;
		if (!isFirstName(m[1])) continue;
		out.push({ kind: 'name', start, end, text: m[0] });
	}
	return out;
}

export function redact(text: string, spans: PiiSpan[]): string {
	let out = '';
	let pos = 0;
	for (const s of [...spans].sort((a, b) => a.start - b.start)) {
		if (s.start < pos) continue;
		out += text.slice(pos, s.start) + PII_PLACEHOLDER[s.kind];
		pos = s.end;
	}
	return out + text.slice(pos);
}
