// Standalone job worker: `pnpm worker` (dev) or `node build-worker/worker.js` (prod).
import { startWorkers } from './lib/server/jobs/handlers';
import { ensureIndices } from './lib/server/search/indices';
import { stopBoss } from './lib/server/jobs/boss';

await ensureIndices();
await startWorkers();

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
	process.on(sig, async () => {
		await stopBoss();
		process.exit(0);
	});
}
