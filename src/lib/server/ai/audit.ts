import { db } from '../db';
import { auditAi } from '../db/schema';

export type AiUsage = { input_tokens?: number | null; output_tokens?: number | null };

/** Records AI call metadata (never payloads) for the cost sheet. Fire-and-forget. */
export function recordAi(entry: {
	kind: string;
	provider: 'typesafe' | 'anthropic' | 'voyage' | 'mock';
	model: string;
	usage?: AiUsage;
	latencyMs: number;
	requestId?: string;
}) {
	db.insert(auditAi)
		.values({
			kind: entry.kind,
			provider: entry.provider,
			model: entry.model,
			inputTokens: entry.usage?.input_tokens ?? 0,
			outputTokens: entry.usage?.output_tokens ?? 0,
			latencyMs: Math.round(entry.latencyMs),
			requestId: entry.requestId
		})
		.catch((e) => console.warn('[audit_ai] insert failed', e.message));
}
