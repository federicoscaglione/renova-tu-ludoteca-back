import { and, eq, or, desc, inArray } from "drizzle-orm";
import { db } from "../db";
import { friend_requests } from "../db/schema/friend_requests";
import { users } from "../db/schema/users";
import type { NewFriendRequest } from "../db/schema/friend_requests";
import type { FriendRequestStatus } from "../db/schema/friend_requests";

export async function create(data: NewFriendRequest) {
  const [row] = await db.insert(friend_requests).values(data).returning();
  return row!;
}

export async function findById(id: string) {
  const [row] = await db.select().from(friend_requests).where(eq(friend_requests.id, id)).limit(1);
  return row ?? null;
}

/** Find any request between two users (any status). */
export async function findBetweenUsers(userIdA: string, userIdB: string) {
  const [row] = await db
    .select()
    .from(friend_requests)
    .where(
      or(
        and(eq(friend_requests.fromUserId, userIdA), eq(friend_requests.toUserId, userIdB)),
        and(eq(friend_requests.fromUserId, userIdB), eq(friend_requests.toUserId, userIdA))
      )
    )
    .limit(1);
  return row ?? null;
}

export async function listSentPending(userId: string) {
  return db
    .select({
      id: friend_requests.id,
      fromUserId: friend_requests.fromUserId,
      toUserId: friend_requests.toUserId,
      status: friend_requests.status,
      createdAt: friend_requests.createdAt,
      toUser: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        city: users.city,
        createdAt: users.createdAt,
      },
    })
    .from(friend_requests)
    .innerJoin(users, eq(friend_requests.toUserId, users.id))
    .where(and(eq(friend_requests.fromUserId, userId), eq(friend_requests.status, "pending")))
    .orderBy(desc(friend_requests.createdAt));
}

export async function listReceivedPending(userId: string) {
  return db
    .select({
      id: friend_requests.id,
      fromUserId: friend_requests.fromUserId,
      toUserId: friend_requests.toUserId,
      status: friend_requests.status,
      createdAt: friend_requests.createdAt,
      fromUser: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        city: users.city,
        createdAt: users.createdAt,
      },
    })
    .from(friend_requests)
    .innerJoin(users, eq(friend_requests.fromUserId, users.id))
    .where(and(eq(friend_requests.toUserId, userId), eq(friend_requests.status, "pending")))
    .orderBy(desc(friend_requests.createdAt));
}

export async function updateStatus(id: string, status: FriendRequestStatus) {
  await db
    .update(friend_requests)
    .set({ status, updatedAt: new Date() })
    .where(eq(friend_requests.id, id));
}

/** List user IDs that are friends with the given user (accepted in either direction). */
export async function listFriendIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({
      otherId: friend_requests.fromUserId,
      otherId2: friend_requests.toUserId,
    })
    .from(friend_requests)
    .where(eq(friend_requests.status, "accepted"));
  const ids = new Set<string>();
  for (const r of rows) {
    if (r.otherId === userId) ids.add(r.otherId2);
    else if (r.otherId2 === userId) ids.add(r.otherId);
  }
  return Array.from(ids);
}

/** List friend user records (for GET /api/friends). */
export async function listFriendsWithUsers(userId: string) {
  const friendIds = await listFriendIds(userId);
  if (friendIds.length === 0) return [];
  return db.select().from(users).where(inArray(users.id, friendIds));
}

/** Delete the friendship row between two users (either direction). Used for "remove friend". */
export async function removeFriendship(userId: string, otherUserId: string) {
  await db
    .delete(friend_requests)
    .where(
      or(
        and(eq(friend_requests.fromUserId, userId), eq(friend_requests.toUserId, otherUserId)),
        and(eq(friend_requests.fromUserId, otherUserId), eq(friend_requests.toUserId, userId))
      )
    );
}
