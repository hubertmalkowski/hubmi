import { needsByPowiat, areaCounts } from '$lib/server/stats';
import { sql } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	setHeaders({ 'cache-control': 'public, s-maxage=120, stale-while-revalidate=600' });
	const area = url.searchParams.get('area') ?? undefined;
	const [byPowiat, areas, innovationsPerArea] = await Promise.all([
		needsByPowiat(area),
		areaCounts(),
		sql<
			{ area: string; n: number }[]
		>`SELECT area_slug AS area, count(*)::int AS n FROM innovations WHERE status = 'published' GROUP BY 1`
	]);
	return {
		byPowiat,
		areaNeeds: areas,
		areaInnovations: Object.fromEntries(innovationsPerArea.map((r) => [r.area, r.n])),
		area: area ?? null
	};
};
