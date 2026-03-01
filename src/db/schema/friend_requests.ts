import { pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core";

export const friendRequestStatuses = ["pending", "accepted", "rejected"] as const;
export type FriendRequestStatus = (typeof friendRequestStatuses)[number];

export const friend_requests = pgTable(
  "friend_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromUserId: text("from_user_id").notNull(),
    toUserId: text("to_user_id").notNull(),
    status: text("status").notNull().$type<FriendRequestStatus>().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.fromUserId, t.toUserId)]
);

export type FriendRequest = typeof friend_requests.$inferSelect;
export type NewFriendRequest = typeof friend_requests.$inferInsert;
