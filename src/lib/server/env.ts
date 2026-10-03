// Server configuration read from process.env, so the same code runs inside SvelteKit,
// the pg-boss worker and the CLI scripts. In development `.env` is loaded once here.
import { existsSync } from 'node:fs';

if (!process.env.DATABASE_URL && existsSync('.env')) {
	process.loadEnvFile('.env');
}

function str(name: string, fallback = ''): string {
	const v = process.env[name];
	return v && v.trim() !== '' ? v : fallback;
}

export const env = {
	databaseUrl: str('DATABASE_URL', 'postgres://zaczyn:zaczyn@localhost:5432/zaczyn'),
	elasticsearchUrl: str('ELASTICSEARCH_URL', 'http://localhost:9200'),
	elasticsearchApiKey: str('ELASTICSEARCH_API_KEY'),
	typesafeApiKey: str('TYPESAFE_API_KEY'),
	anthropicApiKey: str('ANTHROPIC_API_KEY'),
	voyageApiKey: str('VOYAGE_API_KEY'),
	embeddingModel: str('EMBEDDING_MODEL', 'voyage-3.5'),
	embeddingDims: Number(str('EMBEDDING_DIMS', '1024')),
	decisionProvider: str('DECISION_PROVIDER', 'jev') as 'jev' | 'claude',
	/** Deterministic local mocks for every AI provider. Forced on when a provider key is missing. */
	aiMock: str('AI_MOCK', '0') === '1'
};

export const models = {
	generate: 'claude-sonnet-5-5',
	fast: 'claude-haiku-4-5'
} as const;

export function mockDecisions() {
	return (
		env.aiMock || (env.decisionProvider === 'jev' ? !env.typesafeApiKey : !env.anthropicApiKey)
	);
}
export function mockClaude() {
	return env.aiMock || !env.anthropicApiKey;
}
export function mockEmbeddings() {
	return env.aiMock || !env.voyageApiKey;
}
