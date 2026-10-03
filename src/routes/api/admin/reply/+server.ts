import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { ideas, needs } from '$lib/server/db/schema';
import { adminReply } from '$lib/server/ai/prompts';
import { rateLimit } from '$lib/server/ratelimit';
import type { RequestHandler } from './$types';

/** AI-drafted reply for the admin to edit before sending. Admin only (guarded in hooks). */
export const POST: RequestHandler = async ({ request, locals }) => {
	const p = z
		.object({ subject_type: z.enum(['idea', 'need']), subject_id: z.string().uuid() })
		.safeParse(await request.json().catch(() => ({})));
	if (!p.success) error(400, { message: 'Nieprawidłowe dane' });
	await rateLimit(locals.clientKey, 'generate');
	if (p.data.subject_type === 'idea') {
		const i = await db.query.ideas.findFirst({ where: eq(ideas.id, p.data.subject_id) });
		if (!i) error(404, { message: 'Nie znaleziono' });
		return json({
			draft: await adminReply({
				kind: 'idea',
				title: i.title,
				text: `${i.essence}\n${i.howItWorks}`,
				status: i.status
			})
		});
	}
	const n = await db.query.needs.findFirst({ where: eq(needs.id, p.data.subject_id) });
	if (!n) error(404, { message: 'Nie znaleziono' });
	return json({
		draft: await adminReply({
			kind: 'need',
			title: n.redactedText.slice(0, 80),
			text: n.redactedText,
			status: n.status
		})
	});
};
