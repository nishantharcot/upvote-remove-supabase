import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { featureRequests, users, votes } from '@/db/schema';
import { getSessionUser, requireSessionUser } from '@/server/session';

export type FeatureRequestDto = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  status: string;
  submitter_id: string;
  created_at: string;
  updated_at: string;
  up_count: number;
  down_count: number;
  vote_state: 'up' | 'down' | null;
  submitter_name: string | null;
};

type ListInput = {
  statusFilter?: string | null;
  categoryFilter?: string | null;
  searchQuery?: string;
  sortBy?: 'votes' | 'date';
};

async function enrichRequests(
  rows: (typeof featureRequests.$inferSelect)[],
  userId: string | null,
): Promise<FeatureRequestDto[]> {
  if (rows.length === 0) return [];

  const db = getDb();
  const requestIds = rows.map((r) => r.id);

  const voteCounts = await db
    .select({
      requestId: votes.requestId,
      upCount: sql<number>`count(*) filter (where ${votes.voteType} = 1)`.mapWith(Number),
      downCount: sql<number>`count(*) filter (where ${votes.voteType} = -1)`.mapWith(Number),
    })
    .from(votes)
    .where(inArray(votes.requestId, requestIds))
    .groupBy(votes.requestId);

  const countMap = new Map(
    voteCounts.map((v) => [v.requestId, { up: v.upCount, down: v.downCount }]),
  );

  let userVotes: { requestId: string; voteType: number }[] = [];
  if (userId) {
    userVotes = await db
      .select({ requestId: votes.requestId, voteType: votes.voteType })
      .from(votes)
      .where(eq(votes.userId, userId));
  }
  const userVoteMap = new Map(
    userVotes.map((v) => [v.requestId, v.voteType === -1 ? 'down' : 'up'] as const),
  );

  const submitterIds = [...new Set(rows.map((r) => r.submitterId))];
  const submitters = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, submitterIds));
  const nameMap = new Map(submitters.map((s) => [s.id, s.name]));

  return rows.map((r) => {
    const counts = countMap.get(r.id) ?? { up: 0, down: 0 };
    const voteState = userVoteMap.get(r.id) ?? null;
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      status: r.status,
      submitter_id: r.submitterId,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
      up_count: counts.up,
      down_count: counts.down,
      vote_state: voteState,
      submitter_name: nameMap.get(r.submitterId) ?? null,
    };
  });
}

export const listFeatureRequests = createServerFn({ method: 'GET' })
  .inputValidator((data: ListInput) => data)
  .handler(async ({ data }) => {
    await requireSessionUser();
    const db = getDb();
    const sessionUser = await getSessionUser();

    const conditions = [];
    if (data.statusFilter) conditions.push(eq(featureRequests.status, data.statusFilter));
    if (data.categoryFilter) conditions.push(eq(featureRequests.category, data.categoryFilter));
    if (data.searchQuery?.trim()) {
      const q = `%${data.searchQuery.trim()}%`;
      conditions.push(or(ilike(featureRequests.title, q), ilike(featureRequests.description, q))!);
    }

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(featureRequests)
            .where(and(...conditions))
            .orderBy(desc(featureRequests.createdAt))
        : await db.select().from(featureRequests).orderBy(desc(featureRequests.createdAt));
    const enriched = await enrichRequests(rows, sessionUser?.id ?? null);

    enriched.sort((a, b) => {
      if (data.sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return b.up_count - b.down_count - (a.up_count - a.down_count);
    });

    return enriched;
  });

export const getFeatureRequest = createServerFn({ method: 'GET' })
  .inputValidator((data: { requestId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const db = getDb();
    const [row] = await db
      .select()
      .from(featureRequests)
      .where(eq(featureRequests.id, data.requestId))
      .limit(1);

    if (!row) return null;
    const [enriched] = await enrichRequests([row], user.id);
    return enriched;
  });

export const createFeatureRequest = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { title: string; description: string; category: string | null }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const db = getDb();
    const [created] = await db
      .insert(featureRequests)
      .values({
        title: data.title.trim(),
        description: data.description.trim(),
        category: data.category,
        submitterId: user.id,
      })
      .returning();
    return { id: created.id };
  });

export const updateFeatureRequest = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: string;
      title?: string;
      description?: string;
      category?: string | null;
      status?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireSessionUser();
    const db = getDb();
    await db
      .update(featureRequests)
      .set({
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(featureRequests.id, data.id));
    return { success: true };
  });

export const deleteFeatureRequest = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireSessionUser();
    const db = getDb();
    await db.delete(featureRequests).where(eq(featureRequests.id, data.id));
    return { success: true };
  });
