import { desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { calls } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select({
			id: calls.id,
			name: calls.name,
			description: calls.description,
			opensAt: calls.opensAt,
			closesAt: calls.closesAt
		})
		.from(calls)
		.orderBy(desc(calls.closesAt));
	const now = Date.now();
	return {
		open: rows.filter((c) => c.opensAt.getTime() <= now && c.closesAt.getTime() > now),
		closed: rows.filter((c) => c.closesAt.getTime() <= now),
		upcoming: rows.filter((c) => c.opensAt.getTime() > now)
	};
};
