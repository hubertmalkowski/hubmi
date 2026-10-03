// Claude fallback for the decision layer. Renders TypeSafe questions into one JSON
// schema and maps the answers back to the SystemOne response shapes. Claude's
// self-reported confidence is not calibrated like Jev's probabilities, so the
// fallback spreads the remaining mass evenly across the other options.
import { z } from 'zod';
import type { Question, Questions, EntryType } from '@typesafe-ai/sdk';
import type { DecisionProvider, Answers } from './decision';
import { structured } from './claude';
import { models } from '../env';

function describe(entry: EntryType | undefined): string {
	if (entry == null) return '';
	return typeof entry === 'string' ? entry : JSON.stringify(entry);
}

function answerSchema(q: Question) {
	switch (q.type) {
		case 'choice':
			return z.object({
				label: z.enum(Object.keys(q.criteria) as [string, ...string[]]),
				confidence: z.number()
			});
		case 'score':
			return z.object({ level: z.number().int(), confidence: z.number() });
		case 'noul':
			return z.object({ probability: z.number() });
	}
}

function renderQuestion(name: string, q: Question): string {
	const head = `### ${name} (${q.type})\n${describe(q.instructions)}`;
	if (q.type === 'choice')
		return `${head}\nOptions:\n${Object.entries(q.criteria)
			.map(([k, v]) => `- ${k}: ${describe(v)}`)
			.join('\n')}`;
	if (q.type === 'score')
		return `${head}\nLevels:\n${q.criteria.map((v, i) => `- ${i}: ${describe(v)}`).join('\n')}`;
	return `${head}\nYes means: ${describe(q.criteria?.true) || 'the statement holds'}. No means: ${describe(q.criteria?.false) || 'it does not'}.`;
}

const SYSTEM = `You answer typed judgment questions about an application state.
Answer every question independently using only the state. For choice questions pick exactly one label.
For score questions pick the integer level whose description fits best. For yes/no questions give the probability of yes from 0 to 1.
Confidence is your probability (0 to 1) that the chosen answer is correct.`;

export const claudeDecisionProvider: DecisionProvider = {
	name: 'claude',
	async ask<const Q extends Questions>(kind: string, state: EntryType, questions: Q): Promise<Answers<Q>> {
		const shape: Record<string, z.ZodType> = {};
		for (const [name, q] of Object.entries(questions)) shape[name] = answerSchema(q);
		const raw = (await structured({
			kind: `decision.${kind}`,
			model: models.fast,
			system: SYSTEM,
			user: `## State\n${typeof state === 'string' ? state : JSON.stringify(state, null, 1)}\n\n## Questions\n${Object.entries(
				questions
			)
				.map(([n, q]) => renderQuestion(n, q))
				.join('\n\n')}`,
			schema: z.object(shape),
			maxTokens: 4096,
			mock: () => {
				throw new Error('claude decision provider used in mock mode');
			}
		})) as Record<string, { label?: string; level?: number; probability?: number; confidence?: number }>;

		const out: Record<string, unknown> = {};
		for (const [name, q] of Object.entries(questions)) {
			const a = raw[name] ?? {};
			const conf = Math.min(1, Math.max(0, a.confidence ?? 0.6));
			if (q.type === 'noul') {
				out[name] = { type: 'noul', noul: Math.min(1, Math.max(0, a.probability ?? 0.5)) };
			} else if (q.type === 'choice') {
				const labels = Object.keys(q.criteria);
				const chosen = a.label && labels.includes(a.label) ? a.label : labels[labels.length - 1];
				const rest = labels.length > 1 ? (1 - conf) / (labels.length - 1) : 0;
				out[name] = {
					type: 'choice',
					choice: chosen,
					confidence: conf,
					probabilities: Object.fromEntries(labels.map((l) => [l, l === chosen ? conf : rest]))
				};
			} else {
				const n = q.criteria.length;
				const level = Math.min(n - 1, Math.max(0, Math.round(a.level ?? 0)));
				const rest = n > 1 ? (1 - conf) / (n - 1) : 0;
				const probabilities = Object.fromEntries(q.criteria.map((_, i) => [String(i), i === level ? conf : rest]));
				const score = Object.entries(probabilities).reduce((s, [k, p]) => s + Number(k) * p, 0);
				out[name] = {
					type: 'score',
					score,
					confidence: conf,
					probabilities,
					legend: Object.fromEntries(q.criteria.map((c, i) => [String(i), c]))
				};
			}
		}
		return out as Answers<Q>;
	}
};
