import { error, fail } from '@sveltejs/kit';
import { and, asc, eq, gt, lt } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { ideas, statusEvents, calls, challenges, users } from '$lib/server/db/schema';
import { threadFor, threadMessages, postMessage } from '$lib/server/threads';
import { ensureThread } from '$lib/server/status';
import type { Actions, PageServerLoad } from './$types';

async function loadIdea(id: string) {
	if (!/^[0-9a-f-]{36}$/.test(id)) error(404, { message: 'Nie znaleziono' });
	const idea = await db.query.ideas.findFirst({ where: eq(ideas.id, id) });
	if (!idea) error(404, { message: 'Nie znaleziono pomysłu' });
	return idea;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const idea = await loadIdea(params.id);
	const u = locals.user;
	const isOwner = u?.id === idea.authorId;
	const staff = u?.role === 'admin' || u?.role === 'expert';
	const now = new Date();
	const [timeline, thread, openCalls, challenge, author] = await Promise.all([
		db
			.select()
			.from(statusEvents)
			.where(and(eq(statusEvents.subjectType, 'idea'), eq(statusEvents.subjectId, idea.id)))
			.orderBy(asc(statusEvents.createdAt)),
		isOwner || staff ? threadFor('idea', idea.id) : undefined,
		db
			.select({ id: calls.id, name: calls.name, closesAt: calls.closesAt })
			.from(calls)
			.where(and(lt(calls.opensAt, now), gt(calls.closesAt, now))),
		idea.challengeId
			? db.query.challenges.findFirst({
					where: eq(challenges.id, idea.challengeId),
					columns: { id: true, title: true }
				})
			: undefined,
		db.query.users.findFirst({ where: eq(users.id, idea.authorId), columns: { displayName: true } })
	]);
	return {
		idea: {
			id: idea.id,
			title: idea.title,
			essence: idea.essence,
			forWhom: idea.forWhom,
			howItWorks: idea.howItWorks,
			stage: idea.stage,
			status: idea.status,
			canvas: idea.canvas,
			author: author?.displayName ?? ''
		},
		timeline: timeline.map((t) => ({ status: t.status, note: t.note, at: t.createdAt })),
		messages: thread ? await threadMessages(thread.id) : [],
		canPost: isOwner || staff,
		isOwner,
		openCalls,
		challenge: challenge ?? null
	};
};

export const actions: Actions = {
	message: async ({ params, request, locals }) => {
		const idea = await loadIdea(params.id);
		const u = locals.user;
		if (!u || (u.id !== idea.authorId && u.role !== 'admin' && u.role !== 'expert'))
			return fail(403);
		const body = String((await request.formData()).get('body') ?? '').trim();
		if (!body) return fail(400, { empty: true });
		const t = await ensureThread('idea', idea.id, idea.title);
		await postMessage(t.id, u, body.slice(0, 4000));
		return { sent: true };
	}
};
