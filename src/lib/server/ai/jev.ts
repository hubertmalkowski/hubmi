import { TypeSafeClient } from '@typesafe-ai/sdk';
import type { DecisionProvider } from './decision';
import { recordAi } from './audit';
import { env } from '../env';

let client: TypeSafeClient | undefined;
function getClient() {
	// The SDK reads TYPESAFE_API_KEY / TYPESAFE_DEFAULT_MODEL from the environment.
	return (client ??= new TypeSafeClient({
		apiKey: env.typesafeApiKey,
		timeout: 4000,
		retry: { maxRetries: 1 }
	}));
}

export const jevProvider: DecisionProvider = {
	name: 'jev',
	async ask(kind, state, questions) {
		const started = performance.now();
		const { data, requestId } = await getClient().systemOne({ state, questions }).withResponse();
		recordAi({
			kind,
			provider: 'typesafe',
			model: data.model,
			usage: data.usage,
			latencyMs: performance.now() - started,
			requestId
		});
		return data.answers;
	}
};
