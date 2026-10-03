import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { canAccessThread, threadMessages, postMessage } from '$lib/server/threads';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!(await canAccessThread(params.id, locals.user))) error(404, { message: 'Nie znaleziono' });
	return json({ messages: await threadMessages(params.id) });
};

export const POST: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user || !(await canAccessThread(params.id, locals.user)))
		error(404, { message: 'Nie znaleziono' });
	const body = z
		.object({ body: z.string().trim().min(1).max(4000) })
		.safeParse(await request.json().catch(() => ({})));
	if (!body.success) error(400, { message: 'Pusta wiadomość' });
	await postMessage(params.id, locals.user, body.data.body);
	return json({ messages: await threadMessages(params.id) }, { status: 201 });
};
