import cron from "node-cron";
import { logger } from "../lib/logger";
import { runEnrichCatalogJob } from "./enrich-catalog";

const CRON_SCHEDULE = process.env.CRON_ENRICH_CATALOG ?? "*/15 * * * *"; // every 15 min
const ENABLED = process.env.ENABLE_CATALOG_CRON === "1" || process.env.ENABLE_CATALOG_CRON === "true";

export function startScheduler(): void {
  if (!ENABLED) return;
  cron.schedule(CRON_SCHEDULE, async () => {
    try {
      const { enriched } = await runEnrichCatalogJob();
      if (enriched > 0) {
        logger.info({ enriched }, "cron enrich-catalog: entries enriched");
      }
    } catch (e) {
      logger.error(e, "cron enrich-catalog failed");
    }
  });
  logger.info({ schedule: CRON_SCHEDULE }, "cron enrich-catalog scheduled");
}
