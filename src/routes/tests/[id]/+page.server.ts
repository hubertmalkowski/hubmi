import { error, fail, redirect } from '@sveltejs/kit';
import { and, count, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { testCampaigns, testSignups, feedback, innovations, users } from '$lib/server/db/schema';
import { enqueue, QUEUES } from '$lib/server/jobs/boss';
import { feedbackSummary } from '$lib/server/ai/prompts';
import { localizeHref } from '$lib/paraglide/runtime';
import type { Actions, PageServerLoad } from './$types';

async function campaign(id: string) {
	if (!/^[0-9a-f-]{36}$/.test(id)) error(404, { message: 'Nie znaleziono' });
	const c = await db.query.testCampaigns.findFirst({ where: eq(testCampaigns.id, id) });
	if (!c) error(404, { message: 'Nie znaleziono testu' });
	return c;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const c = await campaign(params.id);
	const staff = locals.user?.role === 'admin' || locals.user?.role === 'expert';
	const [[{ n }], signed, inno, items] = await Promise.all([
		db.select({ n: count() }).from(testSignups).where(eq(testSignups.campaignId, c.id)),
		locals.user
			? db.query.testSignups.findFirst({
					where: and(eq(testSignups.campaignId, c.id), eq(testSignups.userId, locals.user.id))
				})
			: undefined,
		c.innovationId
			? db.query.innovations.findFirst({
					where: eq(innovations.id, c.innovationId),
					columns: { slug: true, title: true }
				})
			: undefined,
		staff
			? db
					.select({
						id: feedback.id,
						rating: feedback.rating,
						text: feedback.text,
						category: feedback.category,
						author: users.displayName
					})
					.from(feedback)
					.innerJoin(users, eq(users.id, feedback.userId))
					.where(eq(feedback.campaignId, c.id))
					.orderBy(desc(feedback.createdAt))
			: []
	]);
	return {
		campaign: {
			id: c.id,
			title: c.title,
			description: c.description,
			slots: c.slots,
			open: c.open
		},
		signedCount: n,
		isSigned: !!signed,
		innovation: inno ?? null,
		feedback: items,
		staff
	};
};

export const actions: Actions = {
	signup: async ({ params, locals, url }) => {
		if (!locals.user)
			redirect(303, localizeHref(`/login?next=${encodeURIComponent(url.pathname)}`));
		const c = await campaign(params.id);
		const [{ n }] = await db
			.select({ n: count() })
			.from(testSignups)
			.where(eq(testSignups.campaignId, c.id));
		if (!c.open || n >= c.slots) return fail(409, { full: true });
		await db
			.insert(testSignups)
			.values({ campaignId: c.id, userId: locals.user.id })
			.onConflictDoNothing();
		return { signedUp: true };
	},
	feedback: async ({ params, locals, request }) => {
		if (!locals.user) return fail(401);
		const c = await campaign(params.id);
		const parsed = z
			.object({
				rating: z.coerce.number().int().min(1).max(5),
				text: z.string().max(2000).optional()
			})
			.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { invalid: true });
		const [f] = await db
			.insert(feedback)
			.values({
				campaignId: c.id,
				userId: locals.user.id,
				rating: parsed.data.rating,
				text: parsed.data.text?.trim() || null
			})
			.returning({ id: feedback.id });
		await enqueue(QUEUES.feedbackClassify, { id: f.id });
		return { thanks: true };
	},
	summarize: async ({ params, locals }) => {
		if (locals.user?.role !== 'admin' && locals.user?.role !== 'expert') return fail(403);
		const c = await campaign(params.id);
		const items = await db.select().from(feedback).where(eq(feedback.campaignId, c.id));
		if (!items.length) return { summary: [] };
		const s = await feedbackSummary(
			items.map((f) => ({ rating: f.rating, text: f.text, category: f.category }))
		);
		return { summary: s.improvements };
	}
};
