import { enrichBatch } from "../services/game_catalog.service";

const BATCH_SIZE = 20; // BGG allows max 20 per request; we do 1 request per run, throttled

/**
 * Run one enrichment batch (for cron or manual trigger).
 * Fetches up to BATCH_SIZE catalog entries that lack description and fills them from BGG API.
 */
export async function runEnrichCatalogJob(): Promise<{ enriched: number }> {
  const enriched = await enrichBatch(BATCH_SIZE);
  return { enriched };
}
