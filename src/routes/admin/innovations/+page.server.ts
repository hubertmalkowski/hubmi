import { desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { innovations } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select({
			id: innovations.id,
			slug: innovations.slug,
			title: innovations.title,
			areaSlug: innovations.areaSlug,
			stage: innovations.stage,
			status: innovations.status,
			updatedAt: innovations.updatedAt
		})
		.from(innovations)
		.orderBy(desc(innovations.updatedAt));
	return { innovations: rows };
};
