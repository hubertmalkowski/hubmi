import { z } from 'zod';

export const NEED_MIN = 40;
export const NEED_MAX = 2000;

export const needSchema = z.object({
	text: z.string().trim().min(NEED_MIN).max(NEED_MAX),
	place_teryt: z
		.string()
		.regex(/^\d{7}$/)
		.optional()
		.or(z.literal('').transform(() => undefined))
});

export const classifySchema = z.object({ text: z.string().trim().min(NEED_MIN).max(NEED_MAX) });
