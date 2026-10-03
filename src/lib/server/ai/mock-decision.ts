// Deterministic offline stand-in for Jev. It answers with lexical heuristics so demos
// and tests behave plausibly without API keys. It is not a model: never ship
// decisions from it to real users.
import type { Question, Questions, EntryType } from '@typesafe-ai/sdk';
import type { DecisionProvider, Answers } from './decision';
import { overlap, sigmoid, clamp } from './text';
import { recordAi } from './audit';
import { findPii } from '../entities/pii';

function entryText(e: unknown): string {
	if (e == null) return '';
	if (typeof e === 'string') return e;
	if (typeof e === 'number' || typeof e === 'boolean') return String(e);
	if (Array.isArray(e)) return e.map(entryText).join(' ');
	return Object.values(e as Record<string, unknown>).map(entryText).join(' ');
}

// The real model reads Polish against English criteria semantically; the lexical mock
// needs Polish hint words for the English criteria it is likely to see.
const HINTS: [RegExp, string][] = [
	[/ageing|older people|seniors/i, 'senior seniorzy starszy starsze emeryt babcia dziadek mama lata upadnie DPS'],
	[/mental health/i, 'depresja psychiatra psycholog lęk panika samookalecz kryzys psychicz zdrowie'],
	[/loneliness|isolation/i, 'samotność samotny samotna sama sami spotykać rozmawiać osamotnienie świetlica'],
	[/digital/i, 'internet komputer e-recepta profil zaufany tablet online cyfrowy wideorozmowy bankowość wniosek'],
	[/access to social services|barriers/i, 'dojazd dojechać transport lekarz urząd wózek przychodnia bus rehabilitacja instytucja bariery'],
	[/coordination|cooperation/i, 'instytucja współpraca koordynacja ośrodek szkoła przychodnia rozmawia dokumenty'],
	[/demographic|depopulat|suburb/i, 'wyjeżdżają wyludnia młodzi osiedla nowe rośnie zamknęli szkołę poczta'],
	[/older people or seniors/i, 'senior seniorzy starsi starsza emeryt mama ojciec lata'],
	[/disabilit/i, 'niepełnosprawność niepełnosprawny wózek OzN głuche'],
	[/teenagers|young adults/i, 'młodzież nastolatki uczniowie młodzi'],
	[/children/i, 'dzieci dziecko uczniowie córka syn żłobek'],
	[/families|parents/i, 'rodzina rodziny rodzice matka córka syn dzieci'],
	[/informal carers/i, 'opiekuję opiekunowie opiekun opieka mężem demencją'],
	[/migrants|refugees/i, 'ukrainy uchodźcy migranci cudzoziemcy харків'],
	[/unemployed/i, 'bezrobotni bezrobotne pracę praca'],
	[/villages|rural/i, 'wsi wieś wiosce sołectwa przysiółków rolnicy'],
	[/homeless/i, 'bezdomności bezdomne noclegowni dworcu']
];
function hints(text: string) {
	return HINTS.filter(([re]) => re.test(text))
		.map(([, w]) => w)
		.join(' ');
}

/** Retrieval order prior: the reranker receives candidates in fused-rank order (c1 first). */
function rankPrior(instructions: string): number {
	const m = instructions.match(/`candidates\.c(\d+)`/);
	if (!m) return 0;
	return Math.max(0, 1 - (Number(m[1]) - 1) / 6);
}

function resolvePath(state: unknown, path: string): unknown {
	let cur: unknown = state;
	for (const part of path.split('.')) {
		if (cur && typeof cur === 'object' && part in (cur as Record<string, unknown>)) {
			cur = (cur as Record<string, unknown>)[part];
		} else return undefined;
	}
	return cur;
}

/** Splits an instruction into the state values it references and its remaining wording. */
function subjects(state: EntryType, instructions: string) {
	const paths = [...instructions.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
	const values = paths.map((p) => entryText(resolvePath(state, p))).filter(Boolean);
	const rest = instructions.replace(/`[^`]+`/g, ' ');
	return { values, rest, all: values.length ? values.join(' ') : entryText(state) };
}

function softmax(xs: number[], temp = 0.12) {
	const m = Math.max(...xs);
	const e = xs.map((x) => Math.exp((x - m) / temp));
	const s = e.reduce((a, b) => a + b, 0);
	return e.map((x) => x / s);
}

function answer(state: EntryType, q: Question) {
	const instr = entryText(q.instructions);
	const { values, rest, all } = subjects(state, instr);

	if (q.type === 'noul') {
		if (/personal data|private person|person's name/i.test(instr)) {
			return { type: 'noul', noul: findPii(values[0] ?? entryText(state)).length ? 0.9 : 0.08 };
		}
		if (/social problem or need/i.test(instr)) {
			const text = entryText(state);
			return { type: 'noul', noul: text.split(/\s+/).length >= 8 ? 0.92 : 0.15 };
		}
		const sim = values.length >= 2 ? overlap(values[0], values[1]) : overlap(all, `${rest} ${hints(rest)}`);
		return { type: 'noul', noul: clamp(sigmoid((sim - 0.18) * 14), 0.02, 0.98) };
	}

	if (q.type === 'choice') {
		const labels = Object.keys(q.criteria);
		const raw = labels.map((l) => {
			const crit = entryText(q.criteria[l]);
			const desc = `${l.replace(/_/g, ' ')} ${crit} ${hints(crit)}`;
			if (l === 'none' || l === 'other') return 0.04;
			return overlap(all, desc);
		});
		const p = softmax(raw);
		const best = p.indexOf(Math.max(...p));
		return {
			type: 'choice',
			choice: labels[best],
			confidence: clamp(p[best] * 1.1 - 0.05),
			probabilities: Object.fromEntries(labels.map((l, i) => [l, p[i]]))
		};
	}

	// score: similarity between the two referenced values mapped onto the rubric
	const n = q.criteria.length;
	const sim = values.length >= 2 ? overlap(values[0], values[1]) : overlap(all, rest);
	const target = clamp(0.35 * rankPrior(instr) + 1.6 * sim) * (n - 1);
	const p = softmax(
		q.criteria.map((_, i) => -Math.abs(i - target)),
		0.55
	);
	const score = p.reduce((s, x, i) => s + i * x, 0);
	return {
		type: 'score',
		score,
		confidence: Math.max(...p),
		probabilities: Object.fromEntries(p.map((x, i) => [String(i), x])),
		legend: Object.fromEntries(q.criteria.map((c, i) => [String(i), c]))
	};
}

export const mockDecisionProvider: DecisionProvider = {
	name: 'mock',
	async ask<const Q extends Questions>(kind: string, state: EntryType, questions: Q): Promise<Answers<Q>> {
		const started = performance.now();
		const out: Record<string, unknown> = {};
		for (const [name, q] of Object.entries(questions)) out[name] = answer(state, q);
		recordAi({ kind, provider: 'mock', model: 'mock-decision', latencyMs: performance.now() - started });
		return out as Answers<Q>;
	}
};
