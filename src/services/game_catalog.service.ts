import type { GameCatalogEntry, NewGameCatalogEntry } from "../db/schema/index";
import { NotFoundError } from "../lib/errors";
import * as repo from "../repositories/game_catalog.repository";
import type { SearchCatalogResult } from "../repositories/game_catalog.repository";
import { fetchThings } from "./bgg-client";

const BGG_BASE = "https://boardgamegeek.com/xmlapi2";

export async function getById(id: string): Promise<GameCatalogEntry> {
  const entry = await repo.findById(id);
  if (!entry) throw new NotFoundError("Juego no encontrado en el catálogo");
  return entry;
}

export async function search(options: {
  q: string;
  page?: number;
  pageSize?: number;
  excludeExpansions?: boolean;
}): Promise<SearchCatalogResult> {
  if (!options.q?.trim()) {
    return { items: [], total: 0, page: options.page ?? 1, pageSize: options.pageSize ?? 20 };
  }
  return repo.search({
    q: options.q,
    page: options.page,
    pageSize: options.pageSize,
    excludeExpansions: options.excludeExpansions,
  });
}

export async function getByBggId(bggId: number): Promise<GameCatalogEntry | null> {
  return repo.findByBggId(bggId);
}

export function mapCsvRowToEntry(row: {
  id: string;
  name: string;
  yearpublished: string;
  rank: string;
  bayesaverage: string;
  average: string;
  usersrated: string;
  is_expansion: string;
  abstracts_rank?: string;
  cgs_rank?: string;
  childrensgames_rank?: string;
  familygames_rank?: string;
  partygames_rank?: string;
  strategygames_rank?: string;
  thematic_rank?: string;
  wargames_rank?: string;
}): NewGameCatalogEntry {
  const num = (s: string) => (s === "" || s === undefined ? null : Number(s));
  const int = (s: string) => {
    const n = num(s);
    return n === null ? null : Math.floor(n);
  };
  return {
    bggId: int(row.id)!,
    name: row.name ?? "",
    yearPublished: int(row.yearpublished),
    bggRank: int(row.rank),
    bayesAverage: row.bayesaverage ? String(row.bayesaverage) : null,
    average: row.average ? String(row.average) : null,
    usersRated: int(row.usersrated),
    isExpansion: row.is_expansion === "1",
    abstractsRank: int(row.abstracts_rank ?? ""),
    cgsRank: int(row.cgs_rank ?? ""),
    childrensGamesRank: int(row.childrensgames_rank ?? ""),
    familyGamesRank: int(row.familygames_rank ?? ""),
    partyGamesRank: int(row.partygames_rank ?? ""),
    strategyGamesRank: int(row.strategygames_rank ?? ""),
    thematicRank: int(row.thematic_rank ?? ""),
    wargamesRank: int(row.wargames_rank ?? ""),
    source: "csv",
  };
}

export async function upsertFromCsvRow(row: Parameters<typeof mapCsvRowToEntry>[0]): Promise<GameCatalogEntry> {
  return repo.upsertFromCsv(mapCsvRowToEntry(row));
}

/** Sync one game from BGG by id: fetch thing and create or update catalog entry (enrichment). */
export async function syncFromBgg(bggId: number): Promise<GameCatalogEntry> {
  const [result] = await fetchThings([bggId]);
  if (!result) throw new NotFoundError("Juego no encontrado en BGG");
  const existing = await repo.findByBggId(bggId);
  if (existing) {
    return repo.updateEnrichment(existing.id, {
      minPlayers: result.minPlayers,
      maxPlayers: result.maxPlayers,
      playingTimeMinutes: result.playingTimeMinutes,
      description: result.description,
      imageUrl: result.imageUrl,
    });
  }
  return repo.create({
    bggId: result.bggId,
    name: result.name,
    yearPublished: result.yearPublished,
    minPlayers: result.minPlayers,
    maxPlayers: result.maxPlayers,
    playingTimeMinutes: result.playingTimeMinutes,
    description: result.description,
    imageUrl: result.imageUrl,
    source: "api",
  });
}

/** Enrich up to `batchSize` catalog entries that lack description (for cron). Returns number enriched. */
export async function enrichBatch(batchSize: number = 20): Promise<number> {
  const toEnrich = await repo.findNotEnriched(batchSize);
  if (toEnrich.length === 0) return 0;
  const ids = toEnrich.map((e) => e.bggId);
  const results = await fetchThings(ids);
  let updated = 0;
  for (const r of results) {
    const entry = toEnrich.find((e) => e.bggId === r.bggId);
    if (!entry) continue;
    await repo.updateEnrichment(entry.id, {
      minPlayers: r.minPlayers,
      maxPlayers: r.maxPlayers,
      playingTimeMinutes: r.playingTimeMinutes,
      description: r.description,
      imageUrl: r.imageUrl,
    });
    updated += 1;
  }
  return updated;
}
