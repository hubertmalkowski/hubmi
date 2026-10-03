import { json } from '@sveltejs/kit';
import { trends } from '$lib/server/trends';
import type { RequestHandler } from './$types';

/** Aggregated need trends (admin only, guarded in hooks): `?from=YYYY-MM-DD&to=YYYY-MM-DD`. */
export const GET: RequestHandler = async ({ url }) => {
	const d = (k: string) => {
		const v = url.searchParams.get(k);
		return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v) : undefined;
	};
	return json(await trends(d('from'), d('to')));
};
