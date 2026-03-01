import { pgTable, text, decimal, timestamp, uuid } from "drizzle-orm/pg-core";
import { games } from "./games.js";

export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id").notNull().references(() => games.id),
  buyerId: text("buyer_id").notNull(),
  sellerId: text("seller_id").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  message: text("message").notNull().default(""),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;
