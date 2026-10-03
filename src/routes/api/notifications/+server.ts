import { error, json } from '@sveltejs/kit';
import { userNotifications } from '$lib/server/inbox';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, { message: 'Zaloguj się' });
	const items = await userNotifications(locals.user.id);
	return json({ items, unread: items.filter((n) => !n.readAt).length });
};
