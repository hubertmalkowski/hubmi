import { sql } from './db';

/** Needs per powiat (all statuses except moderation), optionally limited to one area. */
export async function needsByPowiat(area?: string): Promise<Record<string, number>> {
	const rows = await sql<{ powiat: string; n: number }[]>`
		SELECT p.powiat_teryt AS powiat, count(*)::int AS n
		FROM needs n JOIN places p ON p.teryt = n.place_teryt
		WHERE n.status <> 'moderation' ${area ? sql`AND n.area_slug = ${area}` : sql``}
		GROUP BY 1`;
	return Object.fromEntries(rows.map((r) => [r.powiat, r.n]));
}

export async function totals() {
	const [r] = await sql<
		{
			innovations: number;
			open_challenges: number;
			needs: number;
			matched: number;
			challenge: number;
			ideas: number;
		}[]
	>`
		SELECT
			(SELECT count(*)::int FROM innovations WHERE status = 'published') AS innovations,
			(SELECT count(*)::int FROM challenges WHERE open) AS open_challenges,
			(SELECT count(*)::int FROM needs WHERE status <> 'moderation') AS needs,
			(SELECT count(*)::int FROM needs WHERE status = 'matched') AS matched,
			(SELECT count(*)::int FROM needs WHERE status = 'challenge') AS challenge,
			(SELECT count(*)::int FROM ideas WHERE status <> 'draft') AS ideas`;
	return r;
}

export async function areaCounts(): Promise<Record<string, number>> {
	const rows = await sql<{ area: string; n: number }[]>`
		SELECT coalesce(area_slug, 'other') AS area, count(*)::int AS n FROM needs WHERE status <> 'moderation' GROUP BY 1`;
	return Object.fromEntries(rows.map((r) => [r.area, r.n]));
}
