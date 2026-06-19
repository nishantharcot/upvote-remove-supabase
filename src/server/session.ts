import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server';
import { eq, and, gt } from 'drizzle-orm';
import { getDb } from '@/db';
import { sessions, users, userRoles } from '@/db/schema';

const SESSION_COOKIE = 'upvote_session';
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
};

function sessionExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DAYS);
  return d;
}

export async function createSession(userId: string) {
  const db = getDb();
  const token = crypto.randomUUID();
  await db.insert(sessions).values({
    userId,
    token,
    expiresAt: sessionExpiry(),
  });
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const token = getCookie(SESSION_COOKIE);
  if (token) {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  deleteCookie(SESSION_COOKIE, { path: '/' });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;

  const db = getDb();
  const now = new Date();

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now)))
    .limit(1);

  if (!row) return null;

  const adminRole = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(and(eq(userRoles.userId, row.id), eq(userRoles.role, 'admin')))
    .limit(1);

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatarUrl,
    isAdmin: adminRole.length > 0,
  };
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
