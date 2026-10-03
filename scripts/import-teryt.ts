// Imports official gminas for województwo małopolskie (WOJ=12) from the GUS TERYT
// "TERC" register (CSV export from eteryt.stat.gov.pl, `;`-separated, columns
// WOJ;POW;GMI;RODZ;NAZWA;NAZWA_DOD;STAN_NA). Replaces the demo subset in `places`.
//   pnpm tsx scripts/import-teryt.ts TERC_Urzedowy_2026-01-01.csv
import { readFileSync } from 'node:fs';
import { db, sql } from '../src/lib/server/db';
import { places } from '../src/lib/server/db/schema';
import { indexPlaces } from '../src/lib/server/search/sync';

const file = process.argv[2];
if (!file) throw new Error('usage: import-teryt.ts <TERC.csv>');
const [header, ...lines] = readFileSync(file, 'utf8')
	.replace(/^\uFEFF/, '')
	.split(/\r?\n/)
	.filter(Boolean);
const cols = header.split(';');
const col = (row: string[], name: string) => row[cols.indexOf(name)]?.trim() ?? '';

const rows = lines.map((l) => l.split(';')).filter((r) => col(r, 'WOJ') === '12');
const powiats = new Map(
	rows
		.filter((r) => col(r, 'POW') && !col(r, 'GMI'))
		.map((r) => [`12${col(r, 'POW')}`, col(r, 'NAZWA')])
);
// RODZ: 1 urban, 2 rural, 3 urban-rural (4/5 are parts of urban-rural gminas, skipped)
const kinds: Record<string, 'urban' | 'rural' | 'urban_rural'> = {
	'1': 'urban',
	'2': 'rural',
	'3': 'urban_rural'
};
const gminas = rows
	.filter((r) => col(r, 'GMI') && kinds[col(r, 'RODZ')])
	.map((r) => {
		const powiatTeryt = `12${col(r, 'POW')}`;
		return {
			teryt: `${powiatTeryt}${col(r, 'GMI')}${col(r, 'RODZ')}`,
			name: col(r, 'NAZWA'),
			kind: kinds[col(r, 'RODZ')],
			powiatTeryt,
			powiat: powiats.get(powiatTeryt) ?? '',
			population: 0,
			aliases: [] as string[]
		};
	});

for (const g of gminas) {
	await db
		.insert(places)
		.values(g)
		.onConflictDoUpdate({
			target: places.teryt,
			set: { name: g.name, kind: g.kind, powiat: g.powiat, powiatTeryt: g.powiatTeryt }
		});
}
await indexPlaces();
console.log(`imported ${gminas.length} gminas in ${powiats.size} powiats`);
await sql.end();
process.exit(0);
