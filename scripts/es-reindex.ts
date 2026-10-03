// Zero-downtime Elasticsearch rebuild from Postgres: creates `<alias>-v<n+1>`, bulk loads,
// swaps the alias, deletes the old index. Use after mapping/analyzer changes.
//   pnpm tsx scripts/es-reindex.ts [innovations|needs|challenges|places|all]
import { es } from '../src/lib/server/search/es';
import {
	INDEX,
	createVersionedIndex,
	pointAlias,
	type IndexName
} from '../src/lib/server/search/indices';
import { db, sql } from '../src/lib/server/db';
import { innovations, needs, challenges } from '../src/lib/server/db/schema';
import {
	indexInnovation,
	indexNeed,
	indexChallenge,
	indexPlaces
} from '../src/lib/server/search/sync';
import { ne } from 'drizzle-orm';

async function nextVersion(alias: IndexName) {
	const existing = Object.keys(await es.indices.get({ index: `${alias}-v*` }).catch(() => ({})));
	const v = Math.max(0, ...existing.map((n) => Number(n.split('-v').pop()) || 0));
	return { version: v + 1, existing };
}

async function rebuild(alias: IndexName) {
	const { version, existing } = await nextVersion(alias);
	const fresh = await createVersionedIndex(alias, version);
	// write into the new index by pointing the alias first; reads briefly see the new, filling index
	const old = await pointAlias(alias, fresh);
	if (alias === 'innovations')
		for (const r of await db.select({ id: innovations.id }).from(innovations))
			await indexInnovation(r.id);
	if (alias === 'needs')
		for (const r of await db
			.select({ id: needs.id })
			.from(needs)
			.where(ne(needs.status, 'moderation')))
			await indexNeed(r.id);
	if (alias === 'challenges')
		for (const r of await db.select({ id: challenges.id }).from(challenges))
			await indexChallenge(r.id);
	if (alias === 'places') await indexPlaces();
	await es.indices.refresh({ index: fresh });
	for (const name of new Set([...old, ...existing]))
		if (name !== fresh) await es.indices.delete({ index: name }, { ignore: [404] });
	console.log(
		`${alias}: ${fresh} (removed ${[...new Set([...old, ...existing])].filter((n) => n !== fresh).join(', ') || 'nothing'})`
	);
}

const arg = process.argv[2] ?? 'all';
const targets = (arg === 'all' ? Object.values(INDEX) : [arg]) as IndexName[];
for (const t of targets) await rebuild(t);
await sql.end();
process.exit(0);
