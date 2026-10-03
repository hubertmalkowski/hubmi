import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { needs, places } from '$lib/server/db/schema';
import { needSchema } from '$lib/schemas/need';
import { rateLimit } from '$lib/server/ratelimit';
import { enqueue, QUEUES } from '$lib/server/jobs/boss';
import { addStatus } from '$lib/server/status';
import { getLocale, localizeHref } from '$lib/paraglide/runtime';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select({ teryt: places.teryt, name: places.name, powiat: places.powiat })
		.from(places)
		.orderBy(places.powiat, places.name);
	return { places: rows };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = needSchema.safeParse({ text: form.get('text'), place_teryt: form.get('place_teryt') ?? '' });
		if (!parsed.success) return fail(400, { text: String(form.get('text') ?? ''), tooShort: true });
		await rateLimit(locals.clientKey, 'needs');

		const [row] = await db
			.insert(needs)
			.values({
				rawText: parsed.data.text,
				locale: getLocale(),
				placeTeryt: parsed.data.place_teryt ?? null,
				authorId: locals.user?.id ?? null,
				status: 'new'
			})
			.returning({ id: needs.id });
		await addStatus('need', row.id, 'new', undefined, locals.user?.id);
		await enqueue(QUEUES.needProcess, { id: row.id });
		redirect(303, localizeHref(`/report/${row.id}`));
	}
};
