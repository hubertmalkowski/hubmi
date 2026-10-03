// Seeds Postgres and Elasticsearch with demo data (synthetic, no real personal data)
// and runs every seeded need through the real matching pipeline.
//   pnpm db:seed            (uses .env; AI_MOCK=1 runs fully offline)
import { readFileSync } from 'node:fs';
import { sql as dsql } from 'drizzle-orm';
import { db, sql } from '../src/lib/server/db';
import * as s from '../src/lib/server/db/schema';
import { es } from '../src/lib/server/search/es';
import { INDEX, createVersionedIndex, pointAlias } from '../src/lib/server/search/indices';
import { indexInnovation, indexPlaces } from '../src/lib/server/search/sync';
import { embed, embeddingModel } from '../src/lib/server/ai/embed';
import { hash } from '../src/lib/server/ai/text';
import { processNeed } from '../src/lib/server/match/pipeline';
import { refreshTrends } from '../src/lib/server/jobs/handlers';

const json = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;

type AreaSeed = { slug: string; name_pl: string; description_pl: string; description_en: string };
type GroupSeed = { slug: string; name_pl: string; description_en: string };
type PlacesSeed = {
	powiats: { teryt: string; name: string }[];
	gminas: {
		teryt: string;
		name: string;
		kind: 'urban' | 'rural' | 'urban_rural';
		powiat_teryt: string;
		population: number;
		aliases: string[];
	}[];
};
type InnovationSeed = {
	slug: string;
	title: string;
	summary: string;
	description: string;
	area_slug: string;
	target_groups: string[];
	stage: 'idea' | 'prototype' | 'tested' | 'implemented';
	implementation_notes: string;
	cost_hint: string;
};
type NeedSeed = {
	text: string;
	place: string | null;
	locale?: 'pl' | 'en' | 'uk';
	expected: string[];
};

async function resetIndices() {
	for (const alias of Object.values(INDEX)) {
		const existing = await es.indices.get({ index: `${alias}-v*` }).catch(() => ({}));
		for (const name of Object.keys(existing)) await es.indices.delete({ index: name });
		const name = await createVersionedIndex(alias, 1);
		await pointAlias(alias, name);
	}
}

async function main() {
	console.log(`seeding (embeddings: ${embeddingModel()})`);
	await sql`TRUNCATE ${sql.unsafe(
		[
			'audit_ai',
			'ai_cache',
			'rate_limits',
			'translations',
			'notifications',
			'status_events',
			'messages',
			'threads',
			'feedback',
			'test_signups',
			'test_campaigns',
			'applications',
			'calls',
			'ideas',
			'matches',
			'needs',
			'challenges',
			'innovations',
			'target_groups',
			'challenge_areas',
			'places',
			'sessions',
			'users',
			'organizations'
		].join(', ')
	)} CASCADE`;
	await resetIndices();

	const areas = json<AreaSeed[]>('data/seed/areas.json');
	await db.insert(s.challengeAreas).values(
		areas.map((a) => ({
			slug: a.slug,
			namePl: a.name_pl,
			descriptionPl: a.description_pl,
			descriptionEn: a.description_en,
			// illustrative per-powiat indicator for the challenge map (index 0-100, synthetic)
			mapStats: {}
		}))
	);
	await db
		.insert(s.targetGroups)
		.values(
			json<GroupSeed[]>('data/seed/target_groups.json').map((g) => ({
				slug: g.slug,
				namePl: g.name_pl,
				descriptionEn: g.description_en
			}))
		);

	const places = json<PlacesSeed>('data/seed/places.json');
	const powiatName = new Map(places.powiats.map((p) => [p.teryt, p.name]));
	await db.insert(s.places).values(
		places.gminas.map((g) => ({
			teryt: g.teryt,
			name: g.name,
			kind: g.kind,
			powiatTeryt: g.powiat_teryt,
			powiat: powiatName.get(g.powiat_teryt) ?? '',
			population: g.population,
			aliases: g.aliases
		}))
	);
	await indexPlaces();

	const [ngo, gmina, cus] = await db
		.insert(s.organizations)
		.values([
			{ name: 'Stowarzyszenie Sąsiedzi Razem', kind: 'ngo', placeTeryt: '1211011' },
			{ name: 'Urząd Gminy Uście Gorlickie', kind: 'jst', placeTeryt: '1205072' },
			{ name: 'Centrum Usług Społecznych w Wieliczce', kind: 'cus', placeTeryt: '1219053' }
		])
		.returning();

	const demoUsers = await db
		.insert(s.users)
		.values([
			{ displayName: 'Halina (mieszkanka)', role: 'resident', locale: 'pl' },
			{ displayName: 'Ola (NGO)', role: 'ngo', orgId: ngo.id },
			{ displayName: 'Piotr (gmina)', role: 'jst', orgId: gmina.id },
			{
				displayName: 'Dr Anna (ekspertka)',
				role: 'expert',
				expertTags: ['aging', 'loneliness', 'service_access']
			},
			{
				displayName: 'Marek (ekspert)',
				role: 'expert',
				expertTags: ['mental_health', 'digital_exclusion', 'depopulation']
			},
			{ displayName: 'Zespół ROPS (admin)', role: 'admin', orgId: cus.id },
			{ displayName: 'Olena (mieszkanka)', role: 'resident', locale: 'uk' }
		])
		.returning();
	const resident = demoUsers[0];

	// Innovations: embed in one batch, then index.
	const inno = json<InnovationSeed[]>('data/seed/innovations.json');
	const texts = inno.map((i) => `${i.title}. ${i.summary} ${i.description}`);
	const vectors = await embed(texts, 'document');
	const inserted = await db
		.insert(s.innovations)
		.values(
			inno.map((i, k) => ({
				slug: i.slug,
				title: i.title,
				summary: i.summary,
				description: i.description,
				areaSlug: i.area_slug,
				targetGroups: i.target_groups,
				stage: i.stage,
				implementationNotes: i.implementation_notes,
				costHint: i.cost_hint,
				status: 'published' as const,
				embedding: vectors[k],
				embeddingModel: embeddingModel(),
				contentHash: hash(texts[k] + embeddingModel())
			}))
		)
		.returning({ id: s.innovations.id });
	for (const r of inserted) await indexInnovation(r.id);
	await es.indices.refresh({ index: INDEX.innovations });
	console.log(`innovations: ${inserted.length}`);

	// Needs: spread over the last 8 weeks for the trends view, then process each.
	const needSeeds = json<NeedSeed[]>('data/seed/needs.json');
	let n = 0;
	for (const [i, ns] of needSeeds.entries()) {
		const createdAt = new Date(
			Date.now() - ((needSeeds.length - i) / needSeeds.length) * 56 * 86400_000
		);
		const [row] = await db
			.insert(s.needs)
			.values({
				rawText: ns.text,
				locale: ns.locale ?? 'pl',
				placeTeryt: ns.place,
				authorId: ns.locale === 'uk' ? demoUsers[6].id : resident.id,
				createdAt
			})
			.returning({ id: s.needs.id });
		const r = await processNeed(row.id);
		await es.indices.refresh({ index: [INDEX.needs, INDEX.challenges] });
		n++;
		process.stdout.write(`\rneeds processed: ${n}/${needSeeds.length} (${r.status})   `);
	}
	console.log();

	// Grant calls: one open, one closed.
	const now = Date.now();
	const formSchema: s.FormField[] = [
		{ key: 'title', label_pl: 'Nazwa projektu', type: 'text', max_length: 120 },
		{
			key: 'problem',
			label_pl: 'Na jaki problem społeczny odpowiada projekt?',
			type: 'textarea',
			max_length: 1500
		},
		{ key: 'beneficiaries', label_pl: 'Odbiorcy i ich liczba', type: 'textarea', max_length: 800 },
		{
			key: 'solution',
			label_pl: 'Opis rozwiązania i jego innowacyjności',
			type: 'textarea',
			max_length: 2000
		},
		{ key: 'partners', label_pl: 'Partnerzy', type: 'textarea', max_length: 600 },
		{
			key: 'budget',
			label_pl: 'Szacowany budżet i główne koszty',
			type: 'textarea',
			max_length: 800
		},
		{
			key: 'stage',
			label_pl: 'Etap rozwoju',
			type: 'select',
			options: ['pomysł', 'prototyp', 'przetestowane w mikroskali']
		}
	];
	await db.insert(s.calls).values([
		{
			name: 'Inkubator Innowacji Społecznych 2026: nabór II',
			description:
				'Granty do 30 tys. zł na przetestowanie innowacji społecznej w Małopolsce. Priorytet: samotność i starzenie się.',
			opensAt: new Date(now - 7 * 86400_000),
			closesAt: new Date(now + 21 * 86400_000),
			formSchema
		},
		{
			name: 'Inkubator Innowacji Społecznych 2026: nabór I',
			description: 'Zakończony nabór na innowacje w obszarze zdrowia psychicznego młodzieży.',
			opensAt: new Date(now - 120 * 86400_000),
			closesAt: new Date(now - 60 * 86400_000),
			formSchema
		}
	]);

	const firstInno = await db.query.innovations.findFirst({
		where: (t, { eq }) => eq(t.slug, 'kawiarenka-pokolen')
	});
	await db.insert(s.testCampaigns).values([
		{
			innovationId: firstInno?.id,
			title: 'Testujemy: Kawiarenka Pokoleń w nowej formule online',
			description:
				'Sprawdź, czy spotkania pokoleń działają także przez wideorozmowy. 4 spotkania, listopad.',
			slots: 15
		}
	]);

	await refreshTrends();
	const counts = await db.execute(
		dsql`select status, count(*)::int as n from needs group by status order by status`
	);
	console.log('needs by status:', counts);
	await sql.end();
	process.exit(0);
}

main().catch(async (e) => {
	console.error(e);
	await sql.end();
	process.exit(1);
});
