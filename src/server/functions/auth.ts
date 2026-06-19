import { createServerFn } from '@tanstack/react-start';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { createSession, destroySession, getSessionUser } from '@/server/session';

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getSessionUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    profile: {
      name: user.name,
      email: user.email,
      avatar_url: user.avatarUrl,
    },
    isAdmin: user.isAdmin,
  };
});

export const signUp = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; password: string; name: string }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    const email = data.email.trim().toLowerCase();
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      throw new Error('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const [created] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name: data.name.trim() || email.split('@')[0],
      })
      .returning({ id: users.id });

    await createSession(created.id);
    return { success: true };
  });

export const signIn = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    const email = data.email.trim().toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    await createSession(user.id);
    return { success: true };
  });

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  await destroySession();
  return { success: true };
});
