import { fail } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { calls } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

const fieldSchema = z.object({
	key: z.string().regex(/^[a-z_]{2,40}$/),
	label_pl: z.string().min(2).max(200),
	help_pl: z.string().max(400).optional(),
	type: z.enum(['text', 'textarea', 'number', 'select']),
	max_length: z.number().int().positive().max(10000).optional(),
	options: z.array(z.string().max(100)).optional()
});

const DEFAULT_SCHEMA = [
	{ key: 'title', label_pl: 'Nazwa projektu', type: 'text', max_length: 120 },
	{ key: 'problem', label_pl: 'Na jaki problem odpowiada projekt?', type: 'textarea', max_length: 1500 },
	{ key: 'solution', label_pl: 'Opis rozwiązania', type: 'textarea', max_length: 2000 },
	{ key: 'budget', label_pl: 'Budżet', type: 'textarea', max_length: 800 }
];

export const load: PageServerLoad = async () => {
	const rows = await db.select().from(calls).orderBy(desc(calls.opensAt));
	return { calls: rows, defaultSchema: JSON.stringify(DEFAULT_SCHEMA, null, 2) };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const f = Object.fromEntries(await request.formData()) as Record<string, string>;
		let schemaJson: unknown;
		try {
			schemaJson = JSON.parse(f.form_schema);
		} catch {
			return fail(400, { schemaError: 'JSON', values: f });
		}
		const parsed = z
			.object({
				name: z.string().trim().min(3).max(200),
				description: z.string().trim().min(10).max(2000),
				opens_at: z.coerce.date(),
				closes_at: z.coerce.date(),
				form_schema: z.array(fieldSchema).min(1).max(30)
			})
			.safeParse({ ...f, form_schema: schemaJson });
		if (!parsed.success) return fail(400, { schemaError: parsed.error.issues[0]?.message ?? 'invalid', values: f });
		if (parsed.data.closes_at <= parsed.data.opens_at) return fail(400, { schemaError: 'dates', values: f });
		await db.insert(calls).values({
			name: parsed.data.name,
			description: parsed.data.description,
			opensAt: parsed.data.opens_at,
			closesAt: parsed.data.closes_at,
			formSchema: parsed.data.form_schema
		});
		return { created: true };
	}
};
