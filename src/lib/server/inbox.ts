import { desc, eq, inArray, sql as dsql } from 'drizzle-orm';
import { db } from './db';
import { notifications, threads, ideas, needs, messages } from './db/schema';
import type { SessionUser } from './auth';

/** Threads visible to the user: their own ideas/needs, or all for staff. */
export async function userThreads(user: SessionUser) {
	const staff = user.role === 'admin' || user.role === 'expert';
	const base = db
		.select({
			id: threads.id,
			title: threads.title,
			subjectType: threads.subjectType,
			subjectId: threads.subjectId,
			updatedAt: threads.updatedAt,
			last: dsql<Date | null>`(select max(${messages.createdAt}) from ${messages} where ${messages.threadId} = ${threads.id})`,
			count: dsql<number>`(select count(*)::int from ${messages} where ${messages.threadId} = ${threads.id})`
		})
		.from(threads);
	if (staff) return base.orderBy(desc(threads.updatedAt)).limit(100);
	const myIdeas = db.select({ id: ideas.id }).from(ideas).where(eq(ideas.authorId, user.id));
	const myNeeds = db.select({ id: needs.id }).from(needs).where(eq(needs.authorId, user.id));
	return base
		.where(
			dsql`${threads.subjectId} in (${myIdeas}) or ${threads.subjectId} in (${myNeeds}) or ${threads.assignedExpertId} = ${user.id}`
		)
		.orderBy(desc(threads.updatedAt));
}

export async function userNotifications(userId: string, limit = 30) {
	return db
		.select()
		.from(notifications)
		.where(eq(notifications.userId, userId))
		.orderBy(desc(notifications.createdAt))
		.limit(limit);
}

export async function markRead(userId: string, ids?: string[]) {
	await db
		.update(notifications)
		.set({ readAt: new Date() })
		.where(ids?.length ? inArray(notifications.id, ids) : eq(notifications.userId, userId));
}
