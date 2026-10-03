import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { challenges } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select({
			id: challenges.id,
			title: challenges.title,
			description: challenges.description,
			areaSlug: challenges.areaSlug,
			needCount: challenges.needCount,
			placeTeryts: challenges.placeTeryts
		})
		.from(challenges)
		.where(eq(challenges.open, true))
		.orderBy(desc(challenges.needCount), desc(challenges.createdAt));
	return { challenges: rows };
};
