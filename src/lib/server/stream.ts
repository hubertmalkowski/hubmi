/** Wraps an async text generator as a streamed plain-text HTTP response. */
export function textStream(gen: AsyncGenerator<string>, onDone?: () => Promise<void> | void): Response {
	const enc = new TextEncoder();
	const body = new ReadableStream<Uint8Array>({
		async pull(controller) {
			try {
				const { value, done } = await gen.next();
				if (done) {
					await onDone?.();
					controller.close();
				} else controller.enqueue(enc.encode(value));
			} catch (e) {
				console.error('[stream]', e);
				controller.enqueue(enc.encode('\n\n[Przepraszamy, wystąpił błąd. Spróbuj ponownie.]'));
				controller.close();
			}
		},
		cancel() {
			void gen.return(undefined);
		}
	});
	return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-cache' } });
}
