// Postgres → Elasticsearch sync. Postgres is the source of truth; every write enqueues
// an `es.index` job that calls one of these functions with the row id.
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { innovations, needs, challenges, places } from '../db/schema';
import { es } from './es';
import { INDEX } from './indices';

export async function indexInnovation(id: string, refresh = false) {
	const row = await db.query.innovations.findFirst({ where: eq(innovations.id, id) });
	if (!row) return es.delete({ index: INDEX.innovations, id }, { ignore: [404] });
	await es.index({
		index: INDEX.innovations,
		id,
		refresh,
		document: {
			slug: row.slug,
			title: row.title,
			summary: row.summary,
			description: row.description,
			implementation_notes: row.implementationNotes,
			area_slug: row.areaSlug,
			target_groups: row.targetGroups,
			stage: row.stage,
			status: row.status,
			...(row.embedding?.length ? { embedding: row.embedding } : {}),
			updated_at: row.updatedAt
		}
	});
}

export async function indexNeed(id: string, refresh = false) {
	const row = await db.query.needs.findFirst({ where: eq(needs.id, id) });
	// Needs under moderation (possible personal data) are never indexed.
	if (!row || row.status === 'moderation') return es.delete({ index: INDEX.needs, id }, { ignore: [404] });
	const place = row.placeTeryt
		? await db.query.places.findFirst({ where: eq(places.teryt, row.placeTeryt) })
		: undefined;
	await es.index({
		index: INDEX.needs,
		id,
		refresh,
		document: {
			redacted_text: row.redactedText,
			area_slug: row.areaSlug ?? 'other',
			place_teryt: row.placeTeryt ?? undefined,
			powiat_teryt: place?.powiatTeryt,
			status: row.status,
			...(row.embedding?.length ? { embedding: row.embedding } : {}),
			created_at: row.createdAt
		}
	});
}

export async function indexChallenge(id: string, refresh = false) {
	const row = await db.query.challenges.findFirst({ where: eq(challenges.id, id) });
	if (!row) return es.delete({ index: INDEX.challenges, id }, { ignore: [404] });
	await es.index({
		index: INDEX.challenges,
		id,
		refresh,
		document: {
			title: row.title,
			description: row.description,
			area_slug: row.areaSlug,
			open: row.open,
			need_count: row.needCount,
			...(row.embedding?.length ? { embedding: row.embedding } : {})
		}
	});
}

export async function indexPlaces(teryts?: string[]) {
	const rows = teryts?.length
		? await db.select().from(places).where(inArray(places.teryt, teryts))
		: await db.select().from(places);
	if (!rows.length) return;
	await es.bulk({
		refresh: true,
		operations: rows.flatMap((p) => [
			{ index: { _index: INDEX.places, _id: p.teryt } },
			{ teryt: p.teryt, name: p.name, aliases: p.aliases, kind: p.kind, powiat: p.powiat, powiat_teryt: p.powiatTeryt }
		])
	});
}

export type SyncTarget = { index: 'innovations' | 'needs' | 'challenges'; id: string };

export async function syncOne(t: SyncTarget, refresh = false) {
	if (t.index === 'innovations') return indexInnovation(t.id, refresh);
	if (t.index === 'needs') return indexNeed(t.id, refresh);
	return indexChallenge(t.id, refresh);
}
