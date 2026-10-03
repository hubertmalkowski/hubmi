// Token-bucket rate limiting stored in Postgres, so it holds across app instances.
import { error } from '@sveltejs/kit';
import { sql } from './db';

export const LIMITS = {
	classify: { capacity: 30, perMinute: 30 },
	needs: { capacity: 5, perMinute: 5 },
	generate: { capacity: 10, perMinute: 10 },
	simplify: { capacity: 20, perMinute: 20 }
} as const;

export async function rateLimit(key: string, bucket: keyof typeof LIMITS) {
	const { capacity, perMinute } = LIMITS[bucket];
	const rate = perMinute / 60; // tokens per second
	const [row] = await sql<{ tokens: number }[]>`
		INSERT INTO rate_limits (key, bucket, tokens, refilled_at)
		VALUES (${key}, ${bucket}, ${capacity - 1}, now())
		ON CONFLICT (key, bucket) DO UPDATE SET
			tokens = LEAST(${capacity}, rate_limits.tokens + EXTRACT(EPOCH FROM now() - rate_limits.refilled_at) * ${rate}) - 1,
			refilled_at = now()
		RETURNING tokens`;
	if (row.tokens < 0) {
		// undo the overdraft so a blocked client doesn't dig deeper
		await sql`UPDATE rate_limits SET tokens = 0 WHERE key = ${key} AND bucket = ${bucket}`;
		error(429, { message: 'Zbyt wiele zapytań. Spróbuj ponownie za chwilę.' });
	}
}
