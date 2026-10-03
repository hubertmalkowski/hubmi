import { fail } from '@sveltejs/kit';
import { desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db, sql } from '$lib/server/db';
import { ideas, needs, users } from '$lib/server/db/schema';
import { addStatus, ensureThread, notify } from '$lib/server/status';
import { postMessage } from '$lib/server/threads';
import { enqueue, QUEUES } from '$lib/server/jobs/boss';
import { indexNeed } from '$lib/server/search/sync';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [recentNeeds, moderation, ideaRows, failedJobs] = await Promise.all([
		db
			.select({ id: needs.id, text: needs.redactedText, raw: needs.rawText, status: needs.status, area: needs.areaSlug, urgency: needs.urgency, createdAt: needs.createdAt })
			.from(needs)
			.orderBy(desc(needs.createdAt))
			.limit(25),
		db
			.select({ id: needs.id, raw: needs.rawText, redacted: needs.redactedText, createdAt: needs.createdAt })
			.from(needs)
			.where(eq(needs.status, 'moderation'))
			.orderBy(desc(needs.createdAt)),
		db
			.select({
				id: ideas.id,
				title: ideas.title,
				essence: ideas.essence,
				status: ideas.status,
				triage: ideas.triage,
				createdAt: ideas.createdAt,
				author: users.displayName
			})
			.from(ideas)
			.innerJoin(users, eq(users.id, ideas.authorId))
			.where(inArray(ideas.status, ['submitted', 'in_review', 'needs_changes', 'accepted', 'testing']))
			.orderBy(desc(ideas.createdAt)),
		sql<{ id: string; name: string; output: unknown; completed_on: Date | null }[]>`
			SELECT id, name, output, completed_on FROM pgboss.job WHERE state = 'failed' ORDER BY completed_on DESC NULLS LAST LIMIT 10`.catch(() => [])
	]);
	return { recentNeeds, moderation, ideas: ideaRows, failedJobs };
};

const IDEA_STATUSES = ['in_review', 'needs_changes', 'accepted', 'testing', 'library', 'rejected'] as const;

export const actions: Actions = {
	reply: async ({ request, locals }) => {
		const f = Object.fromEntries(await request.formData());
		const parsed = z
			.object({ idea_id: z.string().uuid(), body: z.string().trim().min(1).max(4000), status: z.enum(IDEA_STATUSES).optional().or(z.literal('')) })
			.safeParse(f);
		if (!parsed.success) return fail(400, { invalid: true });
		const idea = await db.query.ideas.findFirst({ where: eq(ideas.id, parsed.data.idea_id) });
		if (!idea) return fail(404);
		const thread = await ensureThread('idea', idea.id, idea.title);
		await postMessage(thread.id, locals.user!, parsed.data.body, f.ai_drafted === '1');
		if (parsed.data.status && parsed.data.status !== idea.status) {
			await db.update(ideas).set({ status: parsed.data.status }).where(eq(ideas.id, idea.id));
			await addStatus('idea', idea.id, parsed.data.status, undefined, locals.user!.id);
			await notify([idea.authorId], 'idea.status', 'idea', idea.id);
		}
		return { replied: idea.id };
	},
	approveNeed: async ({ request, locals }) => {
		const id = String((await request.formData()).get('need_id') ?? '');
		const need = await db.query.needs.findFirst({ where: eq(needs.id, id) });
		if (!need || need.status !== 'moderation') return fail(404);
		// approved after review: the redacted text becomes the working text, then matching re-runs
		await db.update(needs).set({ rawText: need.redactedText, status: 'new' }).where(eq(needs.id, id));
		await addStatus('need', id, 'new', 'Zatwierdzone po moderacji.', locals.user!.id);
		await enqueue(QUEUES.needProcess, { id });
		return { approved: id };
	},
	rejectNeed: async ({ request, locals }) => {
		const id = String((await request.formData()).get('need_id') ?? '');
		await db.update(needs).set({ status: 'closed' }).where(eq(needs.id, id));
		await addStatus('need', id, 'closed', 'Odrzucone podczas moderacji.', locals.user!.id);
		await indexNeed(id);
		return { rejected: id };
	}
};
