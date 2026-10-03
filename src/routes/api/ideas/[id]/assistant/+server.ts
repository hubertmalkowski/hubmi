import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { ideas } from '$lib/server/db/schema';
import { assistantStream, CANVAS_FIELDS, type Locale } from '$lib/server/ai/prompts';
import { hybridSearch } from '$lib/server/search/hybrid';
import { rateLimit } from '$lib/server/ratelimit';
import { textStream } from '$lib/server/stream';
import { getLocale } from '$lib/paraglide/runtime';
import type { RequestHandler } from './$types';

const bodySchema = z.object({
	messages: z
		.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) }))
		.min(1)
		.max(40)
});

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) error(401, { message: 'Zaloguj się' });
	const idea = await db.query.ideas.findFirst({ where: eq(ideas.id, params.id) });
	if (!idea || idea.authorId !== locals.user.id) error(404, { message: 'Nie znaleziono' });
	const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success || parsed.data.messages.at(-1)?.role !== 'user') error(400, { message: 'Nieprawidłowe dane' });
	await rateLimit(locals.clientKey, 'generate');

	const related = await hybridSearch({ text: `${idea.title}. ${idea.essence}`, size: 3, mode: 'bm25' }).catch(() => []);
	const canvasUpdates: Record<string, string> = {};

	const gen = assistantStream({
		idea: { title: idea.title, essence: idea.essence, forWhom: idea.forWhom, howItWorks: idea.howItWorks },
		canvas: idea.canvas,
		related: related.map((r) => ({ title: r.doc.title, summary: r.doc.summary })),
		messages: parsed.data.messages,
		locale: getLocale() as Locale,
		onCanvas: (field, value) => {
			if ((CANVAS_FIELDS as readonly string[]).includes(field)) canvasUpdates[field] = value.slice(0, 1000);
		}
	});

	return textStream(gen, async () => {
		if (Object.keys(canvasUpdates).length) {
			await db.update(ideas).set({ canvas: { ...idea.canvas, ...canvasUpdates } }).where(eq(ideas.id, idea.id));
		}
	});
};
