// Decision layer: typed judgments (Choice / Score / Noul) over application state.
// Primary provider is TypeSafe Jev; Claude structured output is the fallback; a
// deterministic lexical mock runs when no keys are configured (tests, offline demos).
import type { EntryType, Questions, SystemOneResult } from '@typesafe-ai/sdk';
import { env, mockDecisions } from '../env';
import { jevProvider } from './jev';
import { claudeDecisionProvider } from './claude-decision';
import { mockDecisionProvider } from './mock-decision';
import { anthropicAvailable } from './claude';

export type Answers<Q extends Questions> = SystemOneResult<Q>['answers'];

export interface DecisionProvider {
	readonly name: 'jev' | 'claude' | 'mock';
	ask<const Q extends Questions>(kind: string, state: EntryType, questions: Q): Promise<Answers<Q>>;
}

export class DecisionError extends Error {}

let cached: DecisionProvider | undefined;

/** Provider chain: Jev → Claude (on Jev failure) → error. Mock when keys are absent. */
export function decisions(): DecisionProvider {
	if (cached) return cached;
	if (mockDecisions()) return (cached = mockDecisionProvider);
	const primary = env.decisionProvider === 'claude' ? claudeDecisionProvider : jevProvider;
	const fallback =
		primary === jevProvider && anthropicAvailable() ? claudeDecisionProvider : undefined;
	cached = {
		name: primary.name,
		async ask(kind, state, questions) {
			try {
				return await primary.ask(kind, state, questions);
			} catch (e) {
				if (!fallback) throw new DecisionError(`${primary.name} failed: ${(e as Error).message}`);
				console.warn(
					`[decision] ${primary.name} failed for ${kind}, falling back to Claude:`,
					(e as Error).message
				);
				return fallback.ask(kind, state, questions);
			}
		}
	};
	return cached;
}

/** Probability that a Score answer is at or above `level`. */
export function pAtLeast(probabilities: Record<string, number>, level: number): number {
	let p = 0;
	for (const [k, v] of Object.entries(probabilities)) if (Number(k) >= level) p += v;
	return p;
}
