import { pgTable, text, decimal, timestamp, uuid, jsonb, boolean } from "drizzle-orm/pg-core";
import { gameCatalog } from "./game_catalog";

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  catalogGameId: uuid("catalog_game_id").references(() => gameCatalog.id),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  condition: text("condition").notNull().default("Usado"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  location: text("location").notNull().default(""),
  sellerId: text("seller_id").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
