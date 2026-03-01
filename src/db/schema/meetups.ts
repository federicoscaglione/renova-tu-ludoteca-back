import { pgTable, text, integer, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

export const meetups = pgTable("meetups", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  game: jsonb("game").$type<string[]>().notNull().default([]),
  location: text("location").notNull().default(""),
  dateTime: text("date_time").notNull(),
  organizerId: text("organizer_id").notNull(),
  maxPlayers: integer("max_players").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Meetup = typeof meetups.$inferSelect;
export type NewMeetup = typeof meetups.$inferInsert;
