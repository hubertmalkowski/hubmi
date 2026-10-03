// Claude integration: structured JSON outputs and streamed prose.
// Sonnet 5.5 requests opt into server-side refusal fallbacks ("default" routing).
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import { env, mockClaude, models } from '../env';
import { recordAi } from './audit';

let client: Anthropic | undefined;
function getClient() {
	return (client ??= new Anthropic({ apiKey: env.anthropicApiKey, maxRetries: 2 }));
}

export function anthropicAvailable() {
	return !!env.anthropicApiKey && !env.aiMock;
}

type Model = (typeof models)[keyof typeof models];

const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

function systemBlocks(system: string): Anthropic.Beta.BetaTextBlockParam[] {
	// Static system prompts are cached; volatile data goes into the user turn.
	return [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }];
}

/**
 * JSON output validated against a zod schema. `mock` produces the offline result.
 */
export async function structured<S extends z.ZodType>(opts: {
	kind: string;
	model?: Model;
	system: string;
	user: string;
	schema: S;
	maxTokens?: number;
	mock: () => z.infer<S>;
}): Promise<z.infer<S>> {
	if (mockClaude()) return opts.mock();
	const model = opts.model ?? models.fast;
	const started = performance.now();
	const res = await getClient().beta.messages.parse({
		model,
		max_tokens: opts.maxTokens ?? 2048,
		system: systemBlocks(opts.system),
		messages: [{ role: 'user', content: opts.user }],
		output_config: {
			format: zodOutputFormat(opts.schema),
			...(model === models.generate ? { effort: 'low' as const } : {})
		},
		...(model === models.generate ? { betas: [FALLBACK_BETA], fallbacks: 'default' as const } : {})
	});
	recordAi({
		kind: opts.kind,
		provider: 'anthropic',
		model: res.model,
		usage: res.usage,
		latencyMs: performance.now() - started
	});
	if (res.stop_reason === 'refusal') throw new Error(`Claude refused (${opts.kind})`);
	if (res.parsed_output == null)
		throw new Error(`Claude returned no parseable output (${opts.kind})`);
	return res.parsed_output as z.infer<S>;
}

export type ChatMessage = Anthropic.MessageParam;

/** Streams plain text. Yields text chunks; `mock` text is chunked word by word offline. */
export async function* streamText(opts: {
	kind: string;
	model?: Model;
	system: string;
	messages: ChatMessage[];
	maxTokens?: number;
	tools?: Anthropic.Beta.BetaTool[];
	onToolUse?: (name: string, input: unknown) => void;
	mock: () => string;
}): AsyncGenerator<string> {
	if (mockClaude()) {
		for (const piece of opts.mock().split(/(?<=\s)/)) {
			yield piece;
			await new Promise((r) => setTimeout(r, 8));
		}
		return;
	}
	const model = opts.model ?? models.generate;
	const started = performance.now();
	const stream = getClient().beta.messages.stream({
		model,
		max_tokens: opts.maxTokens ?? 8000,
		system: systemBlocks(opts.system),
		messages: opts.messages,
		...(opts.tools ? { tools: opts.tools } : {}),
		...(model === models.generate
			? {
					betas: [FALLBACK_BETA],
					fallbacks: 'default' as const,
					output_config: { effort: 'low' as const }
				}
			: {})
	});
	for await (const event of stream) {
		if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
			yield event.delta.text;
		}
	}
	const final = await stream.finalMessage();
	if (opts.onToolUse) {
		for (const block of final.content) {
			if (block.type === 'tool_use') opts.onToolUse(block.name, block.input);
		}
	}
	recordAi({
		kind: opts.kind,
		provider: 'anthropic',
		model: final.model,
		usage: final.usage,
		latencyMs: performance.now() - started
	});
}

/** Collects a full streamed response into a string. */
export async function generateText(opts: Parameters<typeof streamText>[0]): Promise<string> {
	let out = '';
	for await (const chunk of streamText(opts)) out += chunk;
	return out;
}
