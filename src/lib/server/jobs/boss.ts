// Background jobs on pg-boss (same Postgres, no extra infrastructure). AI work runs
// here, off the request path. Workers run in the app process by default
// (RUN_WORKERS_IN_APP=1) or as a separate process (`pnpm worker`) to scale apart.
import { PgBoss } from 'pg-boss';
import { env } from '../env';

export const QUEUES = {
	needProcess: 'need.process',
	esIndex: 'es.index',
	embedInnovation: 'embed.innovation',
	ideaTriage: 'idea.triage',
	feedbackClassify: 'feedback.classify',
	trendsRefresh: 'trends.refresh',
	translateFill: 'translate.fill'
} as const;
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

let boss: PgBoss | undefined;
let starting: Promise<PgBoss> | undefined;

export async function getBoss(): Promise<PgBoss> {
	if (boss) return boss;
	starting ??= (async () => {
		const b = new PgBoss({ connectionString: env.databaseUrl, schema: 'pgboss' });
		b.on('error', (e) => console.error('[pg-boss]', e));
		await b.start();
		for (const name of Object.values(QUEUES)) {
			await b.createQueue(name, { retryLimit: 2, retryDelay: 5, retryBackoff: true, expireInSeconds: 300 });
		}
		boss = b;
		return b;
	})();
	return starting;
}

export async function enqueue(name: QueueName, data: object, options?: { singletonKey?: string }) {
	const b = await getBoss();
	return b.send(name, data, options);
}

export async function stopBoss() {
	await boss?.stop({ graceful: true });
	boss = undefined;
	starting = undefined;
}
