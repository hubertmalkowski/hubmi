import { error, fail, redirect } from '@sveltejs/kit';
import { and, desc, eq, ne } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { calls, ideas, applications } from '$lib/server/db/schema';
import { addStatus, notifyAdmins } from '$lib/server/status';
import { localizeHref } from '$lib/paraglide/runtime';
import type { Actions, PageServerLoad } from './$types';

async function openCall(id: string) {
	if (!/^[0-9a-f-]{36}$/.test(id)) error(404, { message: 'Nie znaleziono' });
	const call = await db.query.calls.findFirst({ where: eq(calls.id, id) });
	if (!call) error(404, { message: 'Nie znaleziono naboru' });
	const now = Date.now();
	// The generator is only available while the call is open.
	if (call.opensAt.getTime() > now || call.closesAt.getTime() <= now)
		error(410, { message: 'Nabór jest zamknięty' });
	return call;
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user)
		redirect(303, localizeHref(`/login?next=${encodeURIComponent(url.pathname + url.search)}`));
	const call = await openCall(params.id);
	const mine = await db
		.select({ id: ideas.id, title: ideas.title })
		.from(ideas)
		.where(and(eq(ideas.authorId, locals.user.id), ne(ideas.status, 'draft')))
		.orderBy(desc(ideas.createdAt));
	return {
		call: {
			id: call.id,
			name: call.name,
			description: call.description,
			closesAt: call.closesAt,
			fields: call.formSchema
		},
		ideas: mine,
		selectedIdea: url.searchParams.get('idea') ?? mine[0]?.id ?? null
	};
};

export const actions: Actions = {
	default: async ({ params, request, locals }) => {
		if (!locals.user) return fail(401);
		const call = await openCall(params.id);
		const form = await request.formData();
		const ideaId = String(form.get('idea_id') ?? '');
		const idea = await db.query.ideas.findFirst({
			where: and(eq(ideas.id, ideaId), eq(ideas.authorId, locals.user.id))
		});
		if (!idea) return fail(400, { noIdea: true });
		const answers: Record<string, string> = {};
		const missing: string[] = [];
		for (const f of call.formSchema) {
			const v = String(form.get(`f_${f.key}`) ?? '').trim();
			if (!v) missing.push(f.key);
			answers[f.key] = f.max_length ? v.slice(0, f.max_length) : v;
		}
		if (missing.length) return fail(400, { missing, answers });
		await db
			.insert(applications)
			.values({ ideaId: idea.id, callId: call.id, answers, status: 'submitted' });
		await addStatus(
			'idea',
			idea.id,
			'submitted',
			`Wniosek złożony w naborze: ${call.name}`,
			locals.user.id
		);
		await notifyAdmins('application.submitted', 'idea', idea.id);
		redirect(303, localizeHref(`/ideas/${idea.id}`));
	}
};
