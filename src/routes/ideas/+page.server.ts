import { redirect } from '@sveltejs/kit';
import { desc, eq, ne } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { ideas } from '$lib/server/db/schema';
import { localizeHref } from '$lib/paraglide/runtime';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, localizeHref('/login?next=/ideas'));
	const staff = locals.user.role === 'admin' || locals.user.role === 'expert';
	const rows = await db
		.select({
			id: ideas.id,
			title: ideas.title,
			status: ideas.status,
			stage: ideas.stage,
			createdAt: ideas.createdAt
		})
		.from(ideas)
		.where(staff ? ne(ideas.status, 'draft') : eq(ideas.authorId, locals.user.id))
		.orderBy(desc(ideas.createdAt));
	return { ideas: rows, staff };
};
