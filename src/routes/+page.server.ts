import { db } from '$lib/server/db';
import { places } from '$lib/server/db/schema';
import { needsByPowiat, totals } from '$lib/server/stats';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders, locals }) => {
	if (!locals.user)
		setHeaders({ 'cache-control': 'public, s-maxage=120, stale-while-revalidate=600' });
	const [byPowiat, t, placeRows] = await Promise.all([
		needsByPowiat(),
		totals(),
		db
			.select({ teryt: places.teryt, name: places.name, powiat: places.powiat })
			.from(places)
			.orderBy(places.powiat, places.name)
	]);
	return { byPowiat, totals: t, places: placeRows };
};
