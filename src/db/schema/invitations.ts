import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  invitationCode: text("invitation_code").notNull().unique(),
  inviterId: text("inviter_id").notNull(),
  inviteeEmail: text("invitee_email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  used: boolean("used").notNull().default(false),
  usedBy: text("used_by"),
});

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
