import { defineConfig } from '@playwright/test';

// E2E runs against the dev server with AI_MOCK=1 (deterministic, no API keys).
// Needs Postgres and Elasticsearch running and seeded: `pnpm db:seed`.
const port = Number(process.env.E2E_PORT ?? 5174);

export default defineConfig({
	testDir: 'tests/e2e',
	testMatch: '**/*.e2e.ts',
	timeout: 60_000,
	fullyParallel: false,
	workers: 1,
	use: {
		baseURL: `http://localhost:${port}`,
		launchOptions: process.env.PW_CHROMIUM_PATH
			? { executablePath: process.env.PW_CHROMIUM_PATH }
			: {}
	},
	webServer: {
		command: `AI_MOCK=1 pnpm vite dev --port ${port} --strictPort`,
		port,
		reuseExistingServer: true,
		timeout: 120_000
	}
});
