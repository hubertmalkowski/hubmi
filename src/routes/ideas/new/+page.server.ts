import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { challenges, ideas } from '$lib/server/db/schema';
import { ideaSchema } from '$lib/schemas/idea';
import { addStatus, ensureThread } from '$lib/server/status';
import { enqueue, QUEUES } from '$lib/server/jobs/boss';
import { localizeHref } from '$lib/paraglide/runtime';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, localizeHref(`/login?next=${encodeURIComponent(url.pathname + url.search)}`));
	const challengeId = url.searchParams.get('challenge');
	const challenge =
		challengeId && /^[0-9a-f-]{36}$/.test(challengeId)
			? await db.query.challenges.findFirst({ where: eq(challenges.id, challengeId), columns: { id: true, title: true } })
			: undefined;
	return { challenge: challenge ?? null };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'auth' });
		const form = Object.fromEntries(await request.formData());
		const parsed = ideaSchema.safeParse(form);
		if (!parsed.success) {
			return fail(400, { values: form as Record<string, string>, errors: parsed.error.flatten().fieldErrors });
		}
		const d = parsed.data;
		const [idea] = await db
			.insert(ideas)
			.values({
				title: d.title,
				essence: d.essence,
				forWhom: d.for_whom,
				howItWorks: d.how_it_works,
				stage: d.stage,
				challengeId: d.challenge_id ?? null,
				authorId: locals.user.id,
				status: 'submitted',
				canvas: { problem: d.essence, beneficiaries: d.for_whom, solution: d.how_it_works }
			})
			.returning({ id: ideas.id });
		await addStatus('idea', idea.id, 'submitted', undefined, locals.user.id);
		await ensureThread('idea', idea.id, d.title);
		await enqueue(QUEUES.ideaTriage, { id: idea.id });
		redirect(303, localizeHref(`/ideas/${idea.id}?created=1`));
	}
};
