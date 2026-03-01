import { pgTable, text, integer, decimal, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

export const gameCatalog = pgTable("game_catalog", {
  id: uuid("id").primaryKey().defaultRandom(),
  bggId: integer("bgg_id").notNull().unique(),
  name: text("name").notNull(),
  yearPublished: integer("year_published"),
  bggRank: integer("bgg_rank"),
  bayesAverage: decimal("bayes_average", { precision: 10, scale: 5 }),
  average: decimal("average", { precision: 10, scale: 5 }),
  usersRated: integer("users_rated"),
  isExpansion: boolean("is_expansion").notNull().default(false),
  // Optional category ranks from CSV
  abstractsRank: integer("abstracts_rank"),
  cgsRank: integer("cgs_rank"),
  childrensGamesRank: integer("childrensgames_rank"),
  familyGamesRank: integer("familygames_rank"),
  partyGamesRank: integer("partygames_rank"),
  strategyGamesRank: integer("strategygames_rank"),
  thematicRank: integer("thematic_rank"),
  wargamesRank: integer("wargames_rank"),
  // Enrichment from BGG API (thing)
  minPlayers: integer("min_players"),
  maxPlayers: integer("max_players"),
  playingTimeMinutes: integer("playing_time_minutes"),
  description: text("description"),
  imageUrl: text("image_url"),
  source: text("source").notNull().default("csv"), // 'csv' | 'api'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GameCatalogEntry = typeof gameCatalog.$inferSelect;
export type NewGameCatalogEntry = typeof gameCatalog.$inferInsert;
