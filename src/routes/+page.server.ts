import { needsByPowiat, totals } from '$lib/server/stats';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders, locals }) => {
	if (!locals.user)
		setHeaders({ 'cache-control': 'public, s-maxage=120, stale-while-revalidate=600' });
	const [byPowiat, t] = await Promise.all([needsByPowiat(), totals()]);
	return { byPowiat, totals: t };
};
