import { createServerFn } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { votes } from '@/db/schema';
import { requireSessionUser } from '@/server/session';

export const castVote = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { requestId: string; type: 'up' | 'down'; action: 'set' | 'remove' }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const db = getDb();
    const voteType = data.type === 'up' ? 1 : -1;

    const existing = await db
      .select()
      .from(votes)
      .where(and(eq(votes.userId, user.id), eq(votes.requestId, data.requestId)))
      .limit(1);

    if (data.action === 'remove') {
      if (existing[0]) {
        await db.delete(votes).where(eq(votes.id, existing[0].id));
      }
      return { success: true };
    }

    if (existing[0]) {
      await db
        .update(votes)
        .set({ voteType })
        .where(eq(votes.id, existing[0].id));
    } else {
      await db.insert(votes).values({
        userId: user.id,
        requestId: data.requestId,
        voteType,
      });
    }

    return { success: true };
  });
