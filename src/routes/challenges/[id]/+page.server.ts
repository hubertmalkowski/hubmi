import { error } from '@sveltejs/kit';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { challenges, needs, ideas, places } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	if (!/^[0-9a-f-]{36}$/.test(params.id)) error(404, { message: 'Nie znaleziono' });
	const c = await db.query.challenges.findFirst({ where: eq(challenges.id, params.id) });
	if (!c) error(404, { message: 'Nie znaleziono wyzwania' });
	const [reports, answers, gminas] = await Promise.all([
		// only redacted text is ever shown publicly
		db
			.select({ id: needs.id, text: needs.redactedText, createdAt: needs.createdAt })
			.from(needs)
			.where(and(eq(needs.challengeId, c.id), ne(needs.status, 'moderation')))
			.orderBy(desc(needs.createdAt))
			.limit(10),
		db
			.select({ id: ideas.id, title: ideas.title, essence: ideas.essence, status: ideas.status })
			.from(ideas)
			.where(and(eq(ideas.challengeId, c.id), ne(ideas.status, 'draft'))),
		c.placeTeryts.length
			? db.select({ name: places.name, powiat: places.powiat }).from(places).where(inArray(places.teryt, c.placeTeryts))
			: []
	]);
	return { challenge: c, reports, ideas: answers, gminas };
};
