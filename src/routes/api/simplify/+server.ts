import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { aiCache } from '$lib/server/db/schema';
import { easyRead, type Locale } from '$lib/server/ai/prompts';
import { hash } from '$lib/server/ai/text';
import { rateLimit } from '$lib/server/ratelimit';
import type { RequestHandler } from './$types';

const schema = z.object({ key: z.string().max(200), text: z.string().min(1).max(6000), locale: z.enum(['pl', 'en', 'uk']) });

/** Easy-to-read rewrite of a page section, cached by content hash for every visitor. */
export const POST: RequestHandler = async ({ request, locals }) => {
	const parsed = schema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) error(400, { message: 'Nieprawidłowe dane' });
	const keyHash = hash(`${parsed.data.locale}:${parsed.data.text}`);
	const cached = await db.query.aiCache.findFirst({ where: and(eq(aiCache.kind, 'easy_read'), eq(aiCache.keyHash, keyHash)) });
	if (cached) return json(cached.value);
	await rateLimit(locals.clientKey, 'simplify');
	const text = await easyRead(parsed.data.text, parsed.data.locale as Locale);
	await db.insert(aiCache).values({ kind: 'easy_read', keyHash, value: { text } }).onConflictDoNothing();
	return json({ text });
};
