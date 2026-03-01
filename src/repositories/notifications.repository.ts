import { eq, desc, and } from "drizzle-orm";
import { db } from "../db";
import { notifications } from "../db/schema/notifications";
import type { NewNotification } from "../db/schema/notifications";

export async function create(data: NewNotification) {
  const [row] = await db.insert(notifications).values(data).returning();
  return row!;
}

export async function listByUser(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number; offset?: number } = {}
) {
  const { unreadOnly = false, limit = 50, offset = 0 } = options;
  const conditions = unreadOnly
    ? and(eq(notifications.userId, userId), eq(notifications.read, false))
    : eq(notifications.userId, userId);
  return db
    .select()
    .from(notifications)
    .where(conditions)
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function findById(id: string) {
  const [row] = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
  return row ?? null;
}

export async function markRead(id: string, userId: string) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllRead(userId: string) {
  await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
}
