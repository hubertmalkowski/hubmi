import { sql } from './db';

export type TrendRow = { week: string; area_slug: string; powiat_teryt: string | null; need_count: number; challenge_count: number; matched_count: number };

export async function trends(from?: Date, to?: Date) {
	const rows = await sql<TrendRow[]>`
		SELECT to_char(week, 'YYYY-MM-DD') AS week, area_slug, powiat_teryt, need_count, challenge_count, matched_count
		FROM trends_weekly
		WHERE (${from ?? null}::date IS NULL OR week >= ${from ?? null}::date)
		  AND (${to ?? null}::date IS NULL OR week <= ${to ?? null}::date)
		ORDER BY week`;
	const weeks = [...new Set(rows.map((r) => r.week))].sort();
	const weekly = weeks.map((w) => {
		const byArea: Record<string, number> = {};
		for (const r of rows.filter((x) => x.week === w)) byArea[r.area_slug] = (byArea[r.area_slug] ?? 0) + r.need_count;
		return { week: w, byArea };
	});
	const byPowiat: Record<string, Record<string, number>> = {};
	for (const r of rows) {
		const p = r.powiat_teryt ?? 'unknown';
		byPowiat[p] ??= {};
		byPowiat[p][r.area_slug] = (byPowiat[p][r.area_slug] ?? 0) + r.need_count;
	}
	const total = rows.reduce((s, r) => s + r.need_count, 0);
	const matched = rows.reduce((s, r) => s + r.matched_count, 0);
	const challenge = rows.reduce((s, r) => s + r.challenge_count, 0);
	const [top] = await sql<{ id: string; title: string; need_count: number }[]>`
		SELECT id, title, need_count FROM challenges WHERE open ORDER BY need_count DESC LIMIT 1`;
	const topChallenges = await sql<{ id: string; title: string; need_count: number; area_slug: string }[]>`
		SELECT id, title, need_count, area_slug FROM challenges WHERE open ORDER BY need_count DESC, created_at DESC LIMIT 5`;
	return { weekly, byPowiat, totals: { total, matched, challenge }, top: top ?? null, topChallenges };
}
