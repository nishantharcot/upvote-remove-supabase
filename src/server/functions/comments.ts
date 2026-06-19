import { createServerFn } from '@tanstack/react-start';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/db';
import { comments, users } from '@/db/schema';
import { requireSessionUser } from '@/server/session';

export const listComments = createServerFn({ method: 'GET' })
  .inputValidator((data: { requestId: string }) => data)
  .handler(async ({ data }) => {
    await requireSessionUser();
    const db = getDb();
    const rows = await db
      .select()
      .from(comments)
      .where(eq(comments.requestId, data.requestId))
      .orderBy(asc(comments.createdAt));

    if (rows.length === 0) return [];

    const userIds = [...new Set(rows.map((c) => c.userId))];
    const authors = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, userIds));
    const nameMap = new Map(authors.map((a) => [a.id, a.name]));

    return rows.map((c) => ({
      id: c.id,
      user_id: c.userId,
      text: c.text,
      created_at: c.createdAt.toISOString(),
      author_name: nameMap.get(c.userId) ?? null,
    }));
  });

export const createComment = createServerFn({ method: 'POST' })
  .inputValidator((data: { requestId: string; text: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const db = getDb();
    const [created] = await db
      .insert(comments)
      .values({
        requestId: data.requestId,
        userId: user.id,
        text: data.text.trim(),
      })
      .returning({ id: comments.id });
    return { id: created.id };
  });

export const deleteComment = createServerFn({ method: 'POST' })
  .inputValidator((data: { commentId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const db = getDb();
    await db
      .delete(comments)
      .where(and(eq(comments.id, data.commentId), eq(comments.userId, user.id)));
    return { success: true };
  });
