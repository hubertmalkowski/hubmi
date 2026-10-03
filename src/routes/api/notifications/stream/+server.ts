import { error } from '@sveltejs/kit';
import { sql } from '$lib/server/db';
import { userChannel } from '$lib/server/status';
import type { RequestHandler } from './$types';

/** Live notifications for the signed-in user (Postgres LISTEN → SSE). */
export const GET: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) error(401, { message: 'Zaloguj się' });
	const channel = userChannel(locals.user.id);
	const enc = new TextEncoder();
	let unlisten: (() => Promise<void>) | undefined;
	let ping: ReturnType<typeof setInterval> | undefined;

	const stream = new ReadableStream({
		async start(controller) {
			const l = await sql.listen(channel, (kind) => {
				controller.enqueue(enc.encode(`event: notification\ndata: ${JSON.stringify({ kind })}\n\n`));
			});
			unlisten = l.unlisten;
			ping = setInterval(() => controller.enqueue(enc.encode(': ping\n\n')), 25_000);
			request.signal.addEventListener('abort', async () => {
				clearInterval(ping);
				await unlisten?.().catch(() => undefined);
				try {
					controller.close();
				} catch {
					/* closed */
				}
			});
		},
		async cancel() {
			clearInterval(ping);
			await unlisten?.().catch(() => undefined);
		}
	});
	return new Response(stream, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } });
};
