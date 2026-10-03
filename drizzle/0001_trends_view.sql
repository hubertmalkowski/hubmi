-- Weekly need counts per challenge area and powiat for the admin trends panel.
-- Refreshed every 10 minutes by the trends.refresh job.
CREATE MATERIALIZED VIEW IF NOT EXISTS "trends_weekly" AS
SELECT
	date_trunc('week', n.created_at)::date AS week,
	coalesce(n.area_slug, 'other') AS area_slug,
	p.powiat_teryt,
	count(*)::int AS need_count,
	count(*) FILTER (WHERE n.status = 'challenge')::int AS challenge_count,
	count(*) FILTER (WHERE n.status = 'matched')::int AS matched_count
FROM needs n
LEFT JOIN places p ON p.teryt = n.place_teryt
GROUP BY 1, 2, 3;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "trends_weekly_key" ON "trends_weekly" (week, area_slug, powiat_teryt) NULLS NOT DISTINCT;
