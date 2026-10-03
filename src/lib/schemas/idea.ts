import { z } from 'zod';

export const ideaSchema = z.object({
	title: z.string().trim().min(5).max(140),
	essence: z.string().trim().min(20).max(1500),
	for_whom: z.string().trim().min(5).max(800),
	how_it_works: z.string().trim().min(20).max(2000),
	stage: z.enum(['idea', 'prototype', 'micro_tested']),
	challenge_id: z
		.string()
		.uuid()
		.optional()
		.or(z.literal('').transform(() => undefined))
});
export type IdeaInput = z.infer<typeof ideaSchema>;

export const ideaDraftSchema = z.object({
	title: z.string().max(140).default(''),
	essence: z.string().max(1500).default(''),
	for_whom: z.string().max(800).default(''),
	how_it_works: z.string().max(2000).default(''),
	stage: z.string().max(20).default('idea')
});
