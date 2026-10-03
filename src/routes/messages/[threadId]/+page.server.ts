import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { threads } from '$lib/server/db/schema';
import { canAccessThread, threadMessages, postMessage } from '$lib/server/threads';
import { localizeHref } from '$lib/paraglide/runtime';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) redirect(303, localizeHref(`/login?next=${encodeURIComponent(url.pathname)}`));
	if (
		!/^[0-9a-f-]{36}$/.test(params.threadId) ||
		!(await canAccessThread(params.threadId, locals.user))
	)
		error(404, { message: 'Nie znaleziono' });
	const t = await db.query.threads.findFirst({ where: eq(threads.id, params.threadId) });
	return {
		thread: { id: t!.id, title: t!.title, subjectType: t!.subjectType, subjectId: t!.subjectId },
		messages: await threadMessages(t!.id)
	};
};

export const actions: Actions = {
	default: async ({ params, locals, request }) => {
		if (!locals.user || !(await canAccessThread(params.threadId, locals.user))) return fail(403);
		const body = String((await request.formData()).get('body') ?? '').trim();
		if (!body) return fail(400);
		await postMessage(params.threadId, locals.user, body.slice(0, 4000));
		return { sent: true };
	}
};
