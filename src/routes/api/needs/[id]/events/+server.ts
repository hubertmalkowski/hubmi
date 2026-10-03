import { eq } from 'drizzle-orm';
import { db, sql } from '$lib/server/db';
import { needs } from '$lib/server/db/schema';
import { needChannel } from '$lib/server/status';
import type { RequestHandler } from './$types';

/** Server-sent progress of the need pipeline, relayed from Postgres LISTEN/NOTIFY. */
export const GET: RequestHandler = async ({ params, request }) => {
	const need = await db.query.needs.findFirst({ where: eq(needs.id, params.id), columns: { status: true } });
	if (!need) return new Response('not found', { status: 404 });

	const enc = new TextEncoder();
	let unlisten: (() => Promise<void>) | undefined;
	let timeout: ReturnType<typeof setTimeout> | undefined;

	const stream = new ReadableStream({
		async start(controller) {
			const send = (event: string, data: unknown) =>
				controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
			const close = async () => {
				clearTimeout(timeout);
				await unlisten?.().catch(() => undefined);
				try {
					controller.close();
				} catch {
					/* already closed */
				}
			};
			if (need.status !== 'new' && need.status !== 'processing') {
				send('done', { status: need.status });
				return close();
			}
			const l = await sql.listen(needChannel(params.id), (payload) => {
				const msg = JSON.parse(payload) as { step: string; status?: string };
				if (msg.step === 'done') {
					send('done', { status: msg.status });
					void close();
				} else send('step', msg);
			});
			unlisten = l.unlisten;
			// re-check after subscribing, in case processing finished in between
			const now = await db.query.needs.findFirst({ where: eq(needs.id, params.id), columns: { status: true } });
			if (now && now.status !== 'new' && now.status !== 'processing') {
				send('done', { status: now.status });
				return close();
			}
			timeout = setTimeout(() => {
				send('timeout', {});
				void close();
			}, 120_000);
			request.signal.addEventListener('abort', () => void close());
		}
	});

	return new Response(stream, {
		headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' }
	});
};
