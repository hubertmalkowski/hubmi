// Demo authentication: cookie sessions stored in Postgres, one-click role login.
// Production would swap the login page for the regional SSO / login.gov.pl.
import { randomBytes } from 'node:crypto';
import { eq, and, gt } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { db } from './db';
import { sessions, users } from './db/schema';

export const SESSION_COOKIE = 'sid';
const TTL_MS = 7 * 86400_000;

export type SessionUser = {
	id: string;
	displayName: string;
	role: 'resident' | 'ngo' | 'jst' | 'expert' | 'admin';
};

export async function createSession(cookies: Cookies, userId: string, secure: boolean) {
	const id = randomBytes(24).toString('base64url');
	await db.insert(sessions).values({ id, userId, expiresAt: new Date(Date.now() + TTL_MS) });
	cookies.set(SESSION_COOKIE, id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: TTL_MS / 1000
	});
}

export async function readSession(cookies: Cookies): Promise<SessionUser | null> {
	const id = cookies.get(SESSION_COOKIE);
	if (!id) return null;
	const [row] = await db
		.select({ id: users.id, displayName: users.displayName, role: users.role })
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
		.limit(1);
	return row ?? null;
}

export async function destroySession(cookies: Cookies) {
	const id = cookies.get(SESSION_COOKIE);
	if (id) await db.delete(sessions).where(eq(sessions.id, id));
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
