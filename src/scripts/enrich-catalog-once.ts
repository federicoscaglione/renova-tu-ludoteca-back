/**
 * Run one enrichment batch and exit (for system cron).
 * Usage: npx ts-node src/scripts/enrich-catalog-once.ts
 * Env: DATABASE_URL required.
 */
import "dotenv/config";
import { runEnrichCatalogJob } from "../jobs/enrich-catalog";

runEnrichCatalogJob()
  .then(({ enriched }) => {
    console.log(`Enriched ${enriched} catalog entries.`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
