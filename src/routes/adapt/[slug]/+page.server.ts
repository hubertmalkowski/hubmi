import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { innovations, places } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const inno = await db.query.innovations.findFirst({ where: eq(innovations.slug, params.slug) });
	if (!inno) error(404, { message: 'Nie znaleziono innowacji' });
	const gminas = await db
		.select({ teryt: places.teryt, name: places.name, powiat: places.powiat })
		.from(places)
		.orderBy(places.name);
	return { innovation: { slug: inno.slug, title: inno.title, summary: inno.summary }, gminas };
};
