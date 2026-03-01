import { eq, ilike, and, sql, asc, isNull } from "drizzle-orm";
import { db } from "../db/index";
import {
  gameCatalog,
  type GameCatalogEntry,
  type NewGameCatalogEntry,
} from "../db/schema/index";

export async function findById(id: string): Promise<GameCatalogEntry | null> {
  const rows = await db.select().from(gameCatalog).where(eq(gameCatalog.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findByBggId(bggId: number): Promise<GameCatalogEntry | null> {
  const rows = await db.select().from(gameCatalog).where(eq(gameCatalog.bggId, bggId)).limit(1);
  return rows[0] ?? null;
}

export interface SearchCatalogOptions {
  q: string;
  page?: number;
  pageSize?: number;
  excludeExpansions?: boolean;
}

export interface SearchCatalogResult {
  items: GameCatalogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export async function search(options: SearchCatalogOptions): Promise<SearchCatalogResult> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const offset = (page - 1) * pageSize;
  const searchPattern = `%${options.q.trim()}%`;

  const conditions = [ilike(gameCatalog.name, searchPattern)];
  if (options.excludeExpansions) {
    conditions.push(eq(gameCatalog.isExpansion, false));
  }
  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(gameCatalog)
      .where(whereClause)
      .orderBy(asc(gameCatalog.bggRank), asc(gameCatalog.name))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(gameCatalog)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;
  return { items, total, page, pageSize };
}

export async function create(entry: NewGameCatalogEntry): Promise<GameCatalogEntry> {
  const rows = await db.insert(gameCatalog).values(entry).returning();
  return rows[0];
}

export async function upsertFromCsv(row: NewGameCatalogEntry): Promise<GameCatalogEntry> {
  const rows = await db
    .insert(gameCatalog)
    .values({
      ...row,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: gameCatalog.bggId,
      set: {
        name: row.name,
        yearPublished: row.yearPublished,
        bggRank: row.bggRank,
        bayesAverage: row.bayesAverage,
        average: row.average,
        usersRated: row.usersRated,
        isExpansion: row.isExpansion ?? false,
        abstractsRank: row.abstractsRank,
        cgsRank: row.cgsRank,
        childrensGamesRank: row.childrensGamesRank,
        familyGamesRank: row.familyGamesRank,
        partyGamesRank: row.partyGamesRank,
        strategyGamesRank: row.strategyGamesRank,
        thematicRank: row.thematicRank,
        wargamesRank: row.wargamesRank,
        updatedAt: new Date(),
      },
    })
    .returning();
  return rows[0];
}

export async function updateEnrichment(
  id: string,
  data: {
    minPlayers?: number | null;
    maxPlayers?: number | null;
    playingTimeMinutes?: number | null;
    description?: string | null;
    imageUrl?: string | null;
  }
): Promise<GameCatalogEntry> {
  const rows = await db
    .update(gameCatalog)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(gameCatalog.id, id))
    .returning();
  if (!rows[0]) throw new Error("Catalog entry not found");
  return rows[0];
}

/** Entries that have no description (not yet enriched), for cron to process. */
export async function findNotEnriched(limit: number): Promise<GameCatalogEntry[]> {
  return db
    .select()
    .from(gameCatalog)
    .where(isNull(gameCatalog.description))
    .orderBy(asc(gameCatalog.bggRank))
    .limit(limit);
}
