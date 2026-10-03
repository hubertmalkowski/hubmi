// Jev Polish smoke test (plan, hour 0-2): does Jev classify raw Polish needs into the
// right challenge area? Expected area = area of the first labelled innovation.
// Pass mark: ≥ 80% accuracy. Below that, send `normalized_pl` + an English gloss in state.
//   TYPESAFE_API_KEY=… pnpm jev:smoke
import { readFileSync } from 'node:fs';
import { sql } from '../src/lib/server/db';
import { decisions } from '../src/lib/server/ai/decision';
import { intakeQuestions } from '../src/lib/server/ai/questions';
import { taxonomy } from '../src/lib/server/taxonomy';

type Labelled = { text: string; expected: string[]; locale?: string };
const needs = JSON.parse(readFileSync('data/seed/needs.json', 'utf8')) as Labelled[];
const inno = JSON.parse(readFileSync('data/seed/innovations.json', 'utf8')) as {
	slug: string;
	area_slug: string;
}[];
const areaOf = new Map(inno.map((i) => [i.slug, i.area_slug]));

const sample = needs
	.filter((n) => (n.locale ?? 'pl') === 'pl' && n.expected[0] !== 'challenge')
	.slice(0, 20);

async function main() {
	const provider = decisions();
	if (provider.name !== 'jev')
		console.warn(
			`⚠ provider is "${provider.name}", not Jev: set TYPESAFE_API_KEY and AI_MOCK=0 for a real result`
		);
	const { areas, groups } = await taxonomy();
	const qs = intakeQuestions(areas, groups, []);
	let ok = 0;
	const started = performance.now();
	for (const n of sample) {
		const want = areaOf.get(n.expected[0]);
		const a = (await provider.ask('smoke.area', { text: n.text }, qs)) as Record<
			string,
			{ choice: string; confidence: number }
		>;
		const got = a.area.choice;
		if (got === want) ok++;
		console.log(
			`${got === want ? '✓' : '✗'} want=${want} got=${got} conf=${a.area.confidence.toFixed(2)}  ${n.text.slice(0, 60)}…`
		);
	}
	const acc = ok / sample.length;
	const ms = (performance.now() - started) / sample.length;
	console.log(
		`\naccuracy ${(acc * 100).toFixed(0)}% on ${sample.length} Polish needs, ${ms.toFixed(0)} ms per request`
	);
	console.log(
		acc >= 0.8
			? 'PASS: raw Polish state is fine'
			: 'FAIL: add an English gloss to state (see docs/architektura.md)'
	);
	await sql.end();
	process.exit(acc >= 0.8 ? 0 : 1);
}

main().catch(async (e) => {
	console.error(e);
	await sql.end();
	process.exit(1);
});
