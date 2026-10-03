import { db } from './db';
import { challengeAreas, targetGroups } from './db/schema';

type Taxonomy = {
	areas: { slug: string; namePl: string; descriptionEn: string; descriptionPl: string }[];
	groups: { slug: string; namePl: string; descriptionEn: string }[];
};

let cache: { at: number; value: Taxonomy } | undefined;

/** Challenge areas and target groups, cached for a minute (they change rarely). */
export async function taxonomy(): Promise<Taxonomy> {
	if (cache && Date.now() - cache.at < 60_000) return cache.value;
	const [areas, groups] = await Promise.all([
		db.select().from(challengeAreas),
		db.select().from(targetGroups)
	]);
	const value = {
		areas: areas.map((a) => ({
			slug: a.slug,
			namePl: a.namePl,
			descriptionEn: a.descriptionEn,
			descriptionPl: a.descriptionPl
		})),
		groups: groups.map((g) => ({ slug: g.slug, namePl: g.namePl, descriptionEn: g.descriptionEn }))
	};
	cache = { at: Date.now(), value };
	return value;
}
