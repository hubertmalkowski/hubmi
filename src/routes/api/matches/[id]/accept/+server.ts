import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { matches, needs } from '$lib/server/db/schema';
import { addStatus } from '$lib/server/status';
import type { RequestHandler } from './$types';

/** The reporter marks a match as helpful. Accepted matches are future ranking labels. */
export const POST: RequestHandler = async ({ params, locals }) => {
	const match = await db.query.matches.findFirst({ where: eq(matches.id, params.id) });
	if (!match) error(404, { message: 'Nie znaleziono' });
	const need = await db.query.needs.findFirst({ where: eq(needs.id, match.needId) });
	const allowed = locals.user?.role === 'admin' || (need?.authorId && need.authorId === locals.user?.id);
	if (!allowed) error(403, { message: 'Brak uprawnień' });
	await db.update(matches).set({ acceptedAt: new Date() }).where(eq(matches.id, params.id));
	await addStatus('need', match.needId, 'accepted', undefined, locals.user?.id);
	return json({ ok: true });
};
