import { error, json } from '@sveltejs/kit';
import { ideaDraftSchema } from '$lib/schemas/idea';
import { decisions } from '$lib/server/ai/decision';
import { completenessQuestions } from '$lib/server/ai/questions';
import { rateLimit } from '$lib/server/ratelimit';
import type { RequestHandler } from './$types';

/** Live fiszka checklist: one Noul per required element, evaluated in parallel. */
export const POST: RequestHandler = async ({ request, locals }) => {
	const parsed = ideaDraftSchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) error(400, { message: 'Nieprawidłowe dane' });
	await rateLimit(locals.clientKey, 'classify');
	const d = parsed.data;
	const a = await decisions().ask(
		'ideas.completeness',
		{ idea: { title: d.title, essence: d.essence, for_whom: d.for_whom, how_it_works: d.how_it_works, stage: d.stage } },
		completenessQuestions
	);
	return json({ checks: Object.fromEntries(Object.entries(a).map(([k, v]) => [k, (v as { noul: number }).noul])) });
};
