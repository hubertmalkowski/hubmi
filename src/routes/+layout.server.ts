import { and, eq, isNull, count } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	depends('app:unread');
	let unread = 0;
	if (locals.user) {
		const [r] = await db
			.select({ n: count() })
			.from(notifications)
			.where(and(eq(notifications.userId, locals.user.id), isNull(notifications.readAt)));
		unread = r?.n ?? 0;
	}
	return { user: locals.user, a11y: locals.a11y, unread };
};
