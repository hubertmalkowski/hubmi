import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { createSession } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const demo = await db
		.select({ id: users.id, displayName: users.displayName, role: users.role })
		.from(users)
		.orderBy(users.role, users.displayName);
	return { demo, next: url.searchParams.get('next') ?? '/' };
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const userId = String(form.get('userId') ?? '');
		const next = String(form.get('next') ?? '/');
		const user = userId
			? await db.query.users.findFirst({ where: eq(users.id, userId) })
			: undefined;
		if (!user) return fail(400, { error: true });
		await createSession(cookies, user.id, url.protocol === 'https:');
		redirect(303, next.startsWith('/') && !next.startsWith('//') ? next : '/');
	}
};
