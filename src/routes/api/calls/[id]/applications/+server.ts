import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { calls, ideas } from '$lib/server/db/schema';
import { applicationPrefill } from '$lib/server/ai/prompts';
import { rateLimit } from '$lib/server/ratelimit';
import type { RequestHandler } from './$types';

/** Pre-fills an application for an open call from the author's fiszka and canvas (always Polish). */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) error(401, { message: 'Zaloguj się' });
	const body = z
		.object({ idea_id: z.string().uuid() })
		.safeParse(await request.json().catch(() => ({})));
	if (!body.success) error(400, { message: 'Wybierz pomysł' });
	const call = await db.query.calls.findFirst({ where: eq(calls.id, params.id) });
	const now = Date.now();
	if (!call || call.opensAt.getTime() > now || call.closesAt.getTime() <= now)
		error(410, { message: 'Nabór jest zamknięty' });
	const idea = await db.query.ideas.findFirst({
		where: and(eq(ideas.id, body.data.idea_id), eq(ideas.authorId, locals.user.id))
	});
	if (!idea) error(404, { message: 'Nie znaleziono pomysłu' });
	await rateLimit(locals.clientKey, 'generate');
	const answers = await applicationPrefill({
		idea: {
			title: idea.title,
			essence: idea.essence,
			forWhom: idea.forWhom,
			howItWorks: idea.howItWorks,
			stage: idea.stage
		},
		canvas: idea.canvas,
		call: { name: call.name, description: call.description },
		fields: call.formSchema
	});
	return json({ answers });
};
