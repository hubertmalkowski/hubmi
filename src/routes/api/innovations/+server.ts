import { json } from '@sveltejs/kit';
import { searchLibrary } from '$lib/server/library';
import type { RequestHandler } from './$types';

/** Library search for integrations: `?q=&area=&group=&stage=&page=`. */
export const GET: RequestHandler = async ({ url, setHeaders }) => {
	const p = url.searchParams;
	setHeaders({ 'cache-control': 'public, s-maxage=60' });
	const r = await searchLibrary({
		q: p.get('q') ?? undefined,
		area: p.get('area') ?? undefined,
		group: p.get('group') ?? undefined,
		stage: p.get('stage') ?? undefined,
		page: Number(p.get('page') ?? 1)
	});
	return json(r);
};
