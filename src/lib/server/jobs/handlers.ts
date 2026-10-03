import { eq } from 'drizzle-orm';
import { db, sql } from '../db';
import { innovations, ideas, feedback, translations, users } from '../db/schema';
import { getBoss, enqueue, QUEUES } from './boss';
import { processNeed } from '../match/pipeline';
import { syncOne, type SyncTarget } from '../search/sync';
import { embedOne, embeddingModel } from '../ai/embed';
import { decisions } from '../ai/decision';
import { triageQuestions, feedbackQuestions } from '../ai/questions';
import { translate, type Locale } from '../ai/prompts';
import { hash } from '../ai/text';
import { needChannel, notifyAdmins, addStatus } from '../status';
import { taxonomy } from '../taxonomy';

export async function handleNeed(id: string) {
	return processNeed(id, async (step, detail) => {
		await sql.notify(needChannel(id), JSON.stringify({ step, ...detail })).catch(() => undefined);
	});
}

export async function handleEmbedInnovation(id: string) {
	const row = await db.query.innovations.findFirst({ where: eq(innovations.id, id) });
	if (!row) return;
	const text = `${row.title}. ${row.summary} ${row.description}`;
	const contentHash = hash(text + embeddingModel());
	if (row.contentHash !== contentHash || !row.embedding?.length) {
		const embedding = await embedOne(text, 'document');
		await db
			.update(innovations)
			.set({ embedding, embeddingModel: embeddingModel(), contentHash })
			.where(eq(innovations.id, id));
	}
	await syncOne({ index: 'innovations', id });
}

export async function handleIdeaTriage(id: string) {
	const idea = await db.query.ideas.findFirst({ where: eq(ideas.id, id) });
	if (!idea) return;
	const experts = await db
		.select({ tags: users.expertTags })
		.from(users)
		.where(eq(users.role, 'expert'));
	const { areas } = await taxonomy();
	const tagSet = new Set(experts.flatMap((e) => e.tags));
	const tags = Object.fromEntries(
		areas.filter((a) => tagSet.has(a.slug)).map((a) => [a.slug, a.descriptionEn])
	);
	const qs = triageQuestions(
		Object.keys(tags).length
			? tags
			: Object.fromEntries(areas.map((a) => [a.slug, a.descriptionEn]))
	);
	const a = await decisions().ask(
		'idea.triage',
		{ item: { title: idea.title, text: `${idea.essence}\n${idea.forWhom}\n${idea.howItWorks}` } },
		qs
	);
	await db
		.update(ideas)
		.set({
			triage: {
				expert: a.expert.choice,
				expertConfidence: a.expert.confidence,
				priority: a.priority.score
			}
		})
		.where(eq(ideas.id, id));
	await notifyAdmins('idea.submitted', 'idea', id);
}

export async function handleFeedback(id: string) {
	const f = await db.query.feedback.findFirst({ where: eq(feedback.id, id) });
	if (!f) return;
	const a = await decisions().ask(
		'feedback.classify',
		{ feedback: { rating: f.rating, text: f.text ?? '' } },
		feedbackQuestions
	);
	await db
		.update(feedback)
		.set({
			category: a.category.choice,
			categoryP: a.category.confidence,
			actionableP: a.actionable.noul
		})
		.where(eq(feedback.id, id));
}

export async function refreshTrends() {
	await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY trends_weekly`;
}

export async function handleTranslate(job: {
	entity: string;
	entityId: string;
	field: string;
	locale: Locale;
	text: string;
}) {
	const contentHash = hash(job.text);
	const text = await translate(job.text, job.locale);
	await db
		.insert(translations)
		.values({
			entity: job.entity,
			entityId: job.entityId,
			field: job.field,
			locale: job.locale,
			contentHash,
			text
		})
		.onConflictDoNothing();
}

let started = false;

/** Registers every worker on this process. Idempotent. */
export async function startWorkers() {
	if (started) return;
	started = true;
	const boss = await getBoss();
	const one =
		<T>(fn: (d: T) => Promise<unknown>) =>
		async (jobs: { data: T }[]) => {
			for (const j of jobs) await fn(j.data);
		};
	await boss.work<{ id: string }>(
		QUEUES.needProcess,
		{ localConcurrency: 4 },
		one((d) => handleNeed(d.id))
	);
	await boss.work<SyncTarget>(
		QUEUES.esIndex,
		{ localConcurrency: 4 },
		one((d) => syncOne(d))
	);
	await boss.work<{ id: string }>(
		QUEUES.embedInnovation,
		one((d) => handleEmbedInnovation(d.id))
	);
	await boss.work<{ id: string }>(
		QUEUES.ideaTriage,
		one((d) => handleIdeaTriage(d.id))
	);
	await boss.work<{ id: string }>(
		QUEUES.feedbackClassify,
		one((d) => handleFeedback(d.id))
	);
	await boss.work(QUEUES.trendsRefresh, async () => refreshTrends());
	await boss.work<Parameters<typeof handleTranslate>[0]>(
		QUEUES.translateFill,
		one(handleTranslate)
	);
	await boss.schedule(QUEUES.trendsRefresh, '*/10 * * * *');
	console.log('[jobs] workers started');
}

export { enqueue, QUEUES, addStatus };
