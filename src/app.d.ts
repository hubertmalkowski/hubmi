// See https://svelte.dev/docs/kit/types#app.d.ts
import type { SessionUser } from '$lib/server/auth';

export type A11yPrefs = { scale: 100 | 125 | 150; contrast: boolean; dark: boolean; easy: boolean };

declare global {
	namespace App {
		interface Error {
			message: string;
		}
		interface Locals {
			user: SessionUser | null;
			a11y: A11yPrefs;
			/** stable key for rate limiting anonymous visitors */
			clientKey: string;
		}
		interface PageData {
			user: SessionUser | null;
			a11y: A11yPrefs;
		}
	}
}

export {};
