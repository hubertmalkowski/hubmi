import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { innovations, places } from '$lib/server/db/schema';
import { adaptStream, type Locale } from '$lib/server/ai/prompts';
import { rateLimit } from '$lib/server/ratelimit';
import { textStream } from '$lib/server/stream';
import { sql } from '$lib/server/db';
import { getLocale } from '$lib/paraglide/runtime';
import type { RequestHandler } from './$types';

const schema = z.object({
	innovation_slug: z.string().max(120),
	profile: z.object({
		institutionType: z.string().max(80),
		placeTeryt: z.string().max(7).optional(),
		populationBand: z.string().max(40),
		budgetBand: z.string().max(40),
		existingServices: z.array(z.string().max(60)).max(12),
		staff: z.string().max(200),
		notes: z.string().max(1000).optional()
	})
});

/** Middleman: streams an implementation sheet adapting an innovation to an institution. */
export const POST: RequestHandler = async ({ request, locals }) => {
	const parsed = schema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) error(400, { message: 'Nieprawidłowe dane' });
	const inno = await db.query.innovations.findFirst({
		where: eq(innovations.slug, parsed.data.innovation_slug)
	});
	if (!inno) error(404, { message: 'Nie znaleziono innowacji' });
	await rateLimit(locals.clientKey, 'generate');

	const p = parsed.data.profile;
	const place = p.placeTeryt
		? await db.query.places.findFirst({ where: eq(places.teryt, p.placeTeryt) })
		: undefined;
	let placeStats: string | undefined;
	if (place) {
		const [s] = await sql<{ n: number; top: string | null }[]>`
			SELECT count(*)::int AS n,
				(SELECT area_slug FROM needs WHERE place_teryt = ${place.teryt} GROUP BY 1 ORDER BY count(*) DESC LIMIT 1) AS top
			FROM needs WHERE place_teryt = ${place.teryt}`;
		placeStats = `Gmina ${place.name} (powiat ${place.powiat}), ok. ${place.population} mieszkańców. Zgłoszone potrzeby w Hubie: ${s.n}, najczęstszy obszar: ${s.top ?? 'brak danych'}.`;
	}

	return textStream(
		adaptStream({
			innovation: {
				title: inno.title,
				description: inno.description,
				implementationNotes: inno.implementationNotes,
				costHint: inno.costHint,
				slug: inno.slug
			},
			profile: { ...p, placeName: place?.name },
			placeStats,
			locale: getLocale() as Locale
		})
	);
};
