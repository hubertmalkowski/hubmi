import { redirect } from '@sveltejs/kit';
import { userThreads, userNotifications, markRead } from '$lib/server/inbox';
import { localizeHref } from '$lib/paraglide/runtime';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, localizeHref('/login?next=/messages'));
	const [threads, notes] = await Promise.all([
		userThreads(locals.user),
		userNotifications(locals.user.id)
	]);
	const unreadIds = notes.filter((n) => !n.readAt).map((n) => n.id);
	if (unreadIds.length) await markRead(locals.user.id, unreadIds);
	return {
		threads,
		notifications: notes.map((n) => ({
			id: n.id,
			kind: n.kind,
			subjectType: n.subjectType,
			subjectId: n.subjectId,
			createdAt: n.createdAt,
			unread: !n.readAt
		}))
	};
};
