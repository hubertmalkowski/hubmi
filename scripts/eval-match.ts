// Matchmaking evaluation on the labelled seed needs (data/seed/needs.json `expected`).
// Compares retrieval variants and the full match-or-challenge decision.
//   pnpm eval:match            (uses whatever providers .env configures; AI_MOCK=1 offline)
//   pnpm eval:match --json     (machine-readable output)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { inArray } from 'drizzle-orm';
import { db, sql } from '../src/lib/server/db';
import { innovations } from '../src/lib/server/db/schema';
import { hybridSearch, type HybridHit } from '../src/lib/server/search/hybrid';
import { redactPii } from '../src/lib/server/match/classify';
import { rerank } from '../src/lib/server/match/pipeline';
import { decide } from '../src/lib/server/match/policy';
import { embedOne, embeddingModel } from '../src/lib/server/ai/embed';
import { decisions } from '../src/lib/server/ai/decision';

type Labelled = { text: string; expected: string[]; not_need?: boolean };
const labelled = (JSON.parse(readFileSync('data/seed/needs.json', 'utf8')) as Labelled[]).filter(
	(n) => !n.not_need
);

type Row = { hit1: number; hit3: number; rr: number };
const metrics = () => ({ rows: [] as Row[], tp: 0, fp: 0, fn: 0, tn: 0 });
const variants = {
	bm25: metrics(),
	knn: metrics(),
	rrf: metrics(),
	linear: metrics(),
	'rrf+rerank': metrics()
};

function score(ranked: string[], expected: Set<string>): Row {
	const idx = ranked.findIndex((s) => expected.has(s));
	return {
		hit1: idx === 0 ? 1 : 0,
		hit3: idx >= 0 && idx < 3 ? 1 : 0,
		rr: idx >= 0 ? 1 / (idx + 1) : 0
	};
}

async function slugs(hits: HybridHit[]) {
	return hits.map((h) => h.doc.slug);
}

async function main() {
	console.log(
		`decision provider: ${decisions().name}, embeddings: ${embeddingModel()}, needs: ${labelled.length}`
	);
	for (const n of labelled) {
		const { text } = await redactPii(n.text);
		const vector = await embedOne(text, 'query');
		const expected = new Set(n.expected.filter((e) => e !== 'challenge'));
		const isChallenge = n.expected[0] === 'challenge';

		const runs = {
			bm25: await hybridSearch({ text, vector, mode: 'bm25', size: 20 }),
			knn: await hybridSearch({ text, vector, mode: 'knn', size: 20 }),
			rrf: await hybridSearch({ text, vector, size: 20 }),
			linear: await hybridSearch({ text, vector, size: 20, fusion: 'linear' })
		};
		for (const [k, hits] of Object.entries(runs)) {
			if (expected.size)
				variants[k as keyof typeof variants].rows.push(score(await slugs(hits), expected));
		}

		// full decision: rerank the RRF candidates, then match-or-challenge
		const scored = await rerank(text, null, [], runs.rrf);
		const d = decide(scored);
		const bySlug = new Map(runs.rrf.map((h) => [h.id, h.doc.slug]));
		const ranked = (d.isChallenge ? d.uncertain : d.kept).map((s) => bySlug.get(s.id)!);
		const v = variants['rrf+rerank'];
		if (expected.size) v.rows.push(score(ranked.length ? ranked : await slugs(runs.rrf), expected));
		if (isChallenge && d.isChallenge) v.tp++;
		else if (!isChallenge && d.isChallenge) v.fp++;
		else if (isChallenge && !d.isChallenge) v.fn++;
		else v.tn++;
	}

	const avg = (rows: Row[], k: keyof Row) =>
		rows.length ? rows.reduce((s, r) => s + r[k], 0) / rows.length : 0;
	const table = Object.entries(variants).map(([name, v]) => ({
		variant: name,
		n: v.rows.length,
		'hit@1': avg(v.rows, 'hit1').toFixed(2),
		'hit@3': avg(v.rows, 'hit3').toFixed(2),
		MRR: avg(v.rows, 'rr').toFixed(2),
		...(name === 'rrf+rerank'
			? {
					'challenge P': v.tp + v.fp ? (v.tp / (v.tp + v.fp)).toFixed(2) : '–',
					'challenge R': v.tp + v.fn ? (v.tp / (v.tp + v.fn)).toFixed(2) : '–'
				}
			: {})
	}));
	if (process.argv.includes('--json')) console.log(JSON.stringify(table, null, 2));
	else console.table(table);

	mkdirSync('docs/eval', { recursive: true });
	writeFileSync(
		`docs/eval/match-${decisions().name}-${embeddingModel()}.json`,
		JSON.stringify(
			{
				at: new Date().toISOString(),
				provider: decisions().name,
				embeddings: embeddingModel(),
				table
			},
			null,
			2
		)
	);
	// sanity: every expected slug exists in the library
	const all = [...new Set(labelled.flatMap((n) => n.expected).filter((e) => e !== 'challenge'))];
	const found = await db
		.select({ slug: innovations.slug })
		.from(innovations)
		.where(inArray(innovations.slug, all));
	const missing = all.filter((s) => !found.some((f) => f.slug === s));
	if (missing.length) console.warn('labels reference unknown innovations:', missing);
	await sql.end();
	process.exit(0);
}

main().catch(async (e) => {
	console.error(e);
	await sql.end();
	process.exit(1);
});
