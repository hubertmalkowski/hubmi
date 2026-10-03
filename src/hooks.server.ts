import type { Handle, ServerInit } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { readSession } from '$lib/server/auth';
import { parseA11y, htmlClass } from '$lib/a11y';

export const init: ServerInit = async () => {
	// Workers run in the app process unless a separate `pnpm worker` is deployed.
	if (process.env.RUN_WORKERS_IN_APP !== '0' && !process.env.BUILDING) {
		const { ensureIndices } = await import('$lib/server/search/indices');
		const { startWorkers } = await import('$lib/server/jobs/handlers');
		await ensureIndices().catch((e) =>
			console.error('[init] elasticsearch unavailable', e.message)
		);
		await startWorkers().catch((e) => console.error('[init] workers failed to start', e));
	}
};

const handleAuth: Handle = async ({ event, resolve }) => {
	event.locals.user = await readSession(event.cookies);
	event.locals.a11y = parseA11y(event.cookies.get('a11y'));
	event.locals.clientKey = event.locals.user?.id ?? `ip:${event.getClientAddress()}`;

	const path = event.url.pathname;
	const isAdmin = /^\/(?:(?:en|uk)\/)?(?:api\/)?admin(?:\/|$)/.test(path);
	if (isAdmin && event.locals.user?.role !== 'admin') {
		if (path.includes('/api/')) error(403, { message: 'Brak uprawnień' });
		redirect(303, `/login?next=${encodeURIComponent(path)}`);
	}
	return resolve(event);
};

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;
		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale))
					.replace('%zaczyn.htmlclass%', htmlClass(event.locals.a11y))
		});
	});

export const handle = sequence(handleAuth, handleParaglide);
