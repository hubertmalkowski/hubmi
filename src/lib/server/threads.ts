import { and, asc, eq } from 'drizzle-orm';
import { db } from './db';
import { messages, threads, users, ideas, needs } from './db/schema';
import { notify, notifyAdmins } from './status';
import type { SessionUser } from './auth';

export async function threadMessages(threadId: string) {
	return db
		.select({
			id: messages.id,
			body: messages.body,
			createdAt: messages.createdAt,
			author: users.displayName,
			role: users.role,
			aiDrafted: messages.aiDrafted
		})
		.from(messages)
		.innerJoin(users, eq(users.id, messages.authorId))
		.where(eq(messages.threadId, threadId))
		.orderBy(asc(messages.createdAt));
}

/** Who may read and write in a thread: the subject's author, assigned expert, experts and admins. */
export async function canAccessThread(threadId: string, user: SessionUser | null) {
	if (!user) return false;
	if (user.role === 'admin' || user.role === 'expert') return true;
	const t = await db.query.threads.findFirst({ where: eq(threads.id, threadId) });
	if (!t) return false;
	if (t.assignedExpertId === user.id) return true;
	if (t.subjectType === 'idea') {
		const i = await db.query.ideas.findFirst({
			where: eq(ideas.id, t.subjectId),
			columns: { authorId: true }
		});
		return i?.authorId === user.id;
	}
	if (t.subjectType === 'need') {
		const n = await db.query.needs.findFirst({
			where: eq(needs.id, t.subjectId),
			columns: { authorId: true }
		});
		return n?.authorId === user.id;
	}
	return false;
}

/** Posts a message and notifies the other side of the conversation. */
export async function postMessage(
	threadId: string,
	author: SessionUser,
	body: string,
	aiDrafted = false
) {
	const t = await db.query.threads.findFirst({ where: eq(threads.id, threadId) });
	if (!t) throw new Error('thread not found');
	await db.insert(messages).values({ threadId, authorId: author.id, body, aiDrafted });
	let ownerId: string | null = null;
	if (t.subjectType === 'idea') {
		ownerId =
			(
				await db.query.ideas.findFirst({
					where: eq(ideas.id, t.subjectId),
					columns: { authorId: true }
				})
			)?.authorId ?? null;
	} else if (t.subjectType === 'need') {
		ownerId =
			(
				await db.query.needs.findFirst({
					where: eq(needs.id, t.subjectId),
					columns: { authorId: true }
				})
			)?.authorId ?? null;
	}
	if (ownerId && ownerId !== author.id)
		await notify([ownerId], 'message.new', t.subjectType, t.subjectId);
	else {
		if (t.assignedExpertId && t.assignedExpertId !== author.id)
			await notify([t.assignedExpertId], 'message.new', t.subjectType, t.subjectId);
		await notifyAdmins('message.new', t.subjectType, t.subjectId);
	}
}

export async function threadFor(subjectType: 'idea' | 'need', subjectId: string) {
	return db.query.threads.findFirst({
		where: and(eq(threads.subjectType, subjectType), eq(threads.subjectId, subjectId))
	});
}
