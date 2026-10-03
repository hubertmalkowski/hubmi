import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { ideas } from '$lib/server/db/schema';
import { localizeHref } from '$lib/paraglide/runtime';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) redirect(303, localizeHref(`/login?next=${encodeURIComponent(url.pathname)}`));
	const idea = await db.query.ideas.findFirst({ where: eq(ideas.id, params.id) });
	if (!idea || idea.authorId !== locals.user.id) error(404, { message: 'Nie znaleziono pomysłu' });
	return { idea: { id: idea.id, title: idea.title, canvas: idea.canvas } };
};
