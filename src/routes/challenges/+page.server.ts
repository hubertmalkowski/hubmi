import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { challenges } from '$lib/server/db/schema';
import { POWIAT_NAME } from '$lib/powiats';
import { AREA_SLUGS } from '$lib/labels';
import type { PageServerLoad } from './$types';

export type ChallengeSort = 'reports' | 'newest';

/** Lower-case and strip Polish diacritics so "swietlica" finds "świetlica". */
const fold = (s: string) =>
	s.toLocaleLowerCase('pl').normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l');

export const load: PageServerLoad = async ({ url }) => {
	// All filters live in the URL: ?q=…&area=slug&powiat=1205 (TERYT, also used by the map)&sort=…
	const q = url.searchParams.get('q')?.trim() ?? '';
	const powiatParam = url.searchParams.get('powiat');
	const powiat = powiatParam && POWIAT_NAME.has(powiatParam) ? powiatParam : null;
	const areaParam = url.searchParams.get('area');
	const area =
		areaParam && (AREA_SLUGS as readonly string[]).includes(areaParam) ? areaParam : null;
	const sort: ChallengeSort = url.searchParams.get('sort') === 'newest' ? 'newest' : 'reports';

	const rows = await db
		.select({
			id: challenges.id,
			title: challenges.title,
			description: challenges.description,
			areaSlug: challenges.areaSlug,
			needCount: challenges.needCount,
			placeTeryts: challenges.placeTeryts,
			createdAt: challenges.createdAt
		})
		.from(challenges)
		.where(eq(challenges.open, true))
		.orderBy(
			...(sort === 'newest'
				? [desc(challenges.createdAt)]
				: [desc(challenges.needCount), desc(challenges.createdAt)])
		);

	const terms = fold(q).split(/\s+/).filter(Boolean);
	const filtered = rows.filter(
		(c) =>
			(!powiat || c.placeTeryts.some((t) => t.startsWith(powiat))) &&
			(!area || c.areaSlug === area) &&
			terms.every((t) => fold(`${c.title} ${c.description}`).includes(t))
	);
	return { challenges: filtered, total: rows.length, q, powiat, area, sort };
};
