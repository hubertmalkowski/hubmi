import { searchLibrary, PAGE_SIZE } from '$lib/server/library';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const p = url.searchParams;
	const query = {
		q: p.get('q') ?? '',
		area: p.get('area') ?? '',
		group: p.get('group') ?? '',
		stage: p.get('stage') ?? '',
		page: Math.max(1, Number(p.get('page') ?? 1) || 1)
	};
	const r = await searchLibrary(query);
	return { query, ...r, pageSize: PAGE_SIZE };
};
