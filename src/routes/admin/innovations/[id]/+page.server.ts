import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { innovations } from '$lib/server/db/schema';
import { enqueue, QUEUES } from '$lib/server/jobs/boss';
import { localizeHref } from '$lib/paraglide/runtime';
import type { Actions, PageServerLoad } from './$types';

const schema = z.object({
	slug: z
		.string()
		.trim()
		.regex(/^[a-z0-9-]{3,80}$/),
	title: z.string().trim().min(3).max(160),
	summary: z.string().trim().min(10).max(300),
	description: z.string().trim().min(20).max(6000),
	area_slug: z.string().min(2),
	target_groups: z.array(z.string()).default([]),
	stage: z.enum(['idea', 'prototype', 'tested', 'implemented']),
	video_url: z
		.string()
		.url()
		.optional()
		.or(z.literal('').transform(() => undefined)),
	implementation_notes: z.string().max(3000).default(''),
	cost_hint: z.string().max(300).default(''),
	status: z.enum(['draft', 'published'])
});

export const load: PageServerLoad = async ({ params }) => {
	if (params.id === 'new') return { innovation: null };
	if (!/^[0-9a-f-]{36}$/.test(params.id)) error(404, { message: 'Nie znaleziono' });
	const i = await db.query.innovations.findFirst({ where: eq(innovations.id, params.id) });
	if (!i) error(404, { message: 'Nie znaleziono' });
	const { embedding: _e, ...rest } = i;
	return { innovation: rest };
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		const fd = await request.formData();
		const raw = {
			...Object.fromEntries(fd),
			target_groups: fd.getAll('target_groups').map(String)
		};
		const parsed = schema.safeParse(raw);
		if (!parsed.success)
			return fail(400, {
				errors: parsed.error.flatten().fieldErrors,
				values: raw as Record<string, unknown>
			});
		const d = parsed.data;
		const values = {
			slug: d.slug,
			title: d.title,
			summary: d.summary,
			description: d.description,
			areaSlug: d.area_slug,
			targetGroups: d.target_groups,
			stage: d.stage,
			videoUrl: d.video_url ?? null,
			implementationNotes: d.implementation_notes,
			costHint: d.cost_hint,
			status: d.status
		};
		let id = params.id;
		try {
			if (id === 'new') {
				const [r] = await db.insert(innovations).values(values).returning({ id: innovations.id });
				id = r.id;
			} else {
				await db.update(innovations).set(values).where(eq(innovations.id, id));
			}
		} catch {
			return fail(409, { slugTaken: true, values: raw as Record<string, unknown> });
		}
		// re-embed (only if content changed) and reindex in the background
		await enqueue(QUEUES.embedInnovation, { id });
		redirect(303, localizeHref(`/admin/innovations/${id}?saved=1`));
	}
};
