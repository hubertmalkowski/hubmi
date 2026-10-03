// Status timeline, notifications and threads shared by every module.
import { and, eq } from 'drizzle-orm';
import { db, sql } from './db';
import { statusEvents, notifications, users, threads } from './db/schema';

type Subject = 'need' | 'idea' | 'innovation' | 'challenge' | 'application';

export async function addStatus(subjectType: Subject, subjectId: string, status: string, note?: string, actorId?: string) {
	await db.insert(statusEvents).values({ subjectType, subjectId, status, note, actorId });
}

export async function notify(userIds: string[], kind: string, subjectType: Subject, subjectId: string) {
	if (!userIds.length) return;
	await db.insert(notifications).values(userIds.map((userId) => ({ userId, kind, subjectType, subjectId })));
	await Promise.all(userIds.map((u) => sql.notify(`user_${u.replace(/-/g, '')}`, kind).catch(() => undefined)));
}

export async function notifyAdmins(kind: string, subjectType: Subject, subjectId: string) {
	const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'));
	await notify(
		admins.map((a) => a.id),
		kind,
		subjectType,
		subjectId
	);
}

export async function ensureThread(subjectType: Subject, subjectId: string, title: string) {
	const existing = await db.query.threads.findFirst({
		where: and(eq(threads.subjectType, subjectType), eq(threads.subjectId, subjectId))
	});
	if (existing) return existing;
	const [t] = await db.insert(threads).values({ subjectType, subjectId, title }).onConflictDoNothing().returning();
	return t ?? (await db.query.threads.findFirst({ where: and(eq(threads.subjectType, subjectType), eq(threads.subjectId, subjectId)) }))!;
}

/** Channel used to push need-processing progress to the SSE endpoint. */
export const needChannel = (id: string) => `need_${id.replace(/-/g, '')}`;
export const userChannel = (id: string) => `user_${id.replace(/-/g, '')}`;
