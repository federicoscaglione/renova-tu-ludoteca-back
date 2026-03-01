/**
 * Import BGG catalog from CSV (tab- or comma-separated).
 * Usage: npx ts-node src/scripts/import-bgg-csv.ts <path-to-csv> [--max-rank=10000] [--exclude-expansions]
 * Env: DATABASE_URL required.
 */
import "dotenv/config";
import * as fs from "fs";
import { upsertFromCsvRow } from "../services/game_catalog.service";

type CsvRow = Parameters<typeof upsertFromCsvRow>[0];

const args = process.argv.slice(2);
const fileArg = args.find((a) => !a.startsWith("--"));
const maxRankArg = args.find((a) => a.startsWith("--max-rank="));
const excludeExpansions = args.includes("--exclude-expansions");

const csvPath = fileArg ?? process.env.BGG_CSV_PATH ?? "";
const maxRank = maxRankArg ? parseInt(maxRankArg.split("=")[1], 10) : undefined;

if (!csvPath || !fs.existsSync(csvPath)) {
  console.error("Usage: npx ts-node src/scripts/import-bgg-csv.ts <path-to-csv> [--max-rank=10000] [--exclude-expansions]");
  console.error("  Or set BGG_CSV_PATH env and run with options.");
  process.exit(1);
}

const POSSIBLE_HEADERS = [
  "id",
  "name",
  "yearpublished",
  "rank",
  "bayesaverage",
  "average",
  "usersrated",
  "is_expansion",
  "abstracts_rank",
  "cgs_rank",
  "childrensgames_rank",
  "familygames_rank",
  "partygames_rank",
  "strategygames_rank",
  "thematic_rank",
  "wargames_rank",
] as const;

function detectDelimiter(firstLine: string): "\t" | "," {
  return firstLine.includes("\t") ? "\t" : ",";
}

function parseLine(line: string, headerIndices: Record<string, number>, delimiter: "\t" | ","): CsvRow {
  const values = line.split(delimiter);
  const row: Record<string, string> = {};
  for (const key of POSSIBLE_HEADERS) {
    const i = headerIndices[key];
    row[key] = i !== undefined ? (values[i] ?? "").trim() : "";
  }
  return row as CsvRow;
}

async function main() {
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    console.error("CSV has no data rows.");
    process.exit(1);
  }
  const delimiter = detectDelimiter(lines[0]);
  const headerCells = lines[0].split(delimiter).map((c) => c.trim().toLowerCase());
  const headerIndices: Record<string, number> = {};
  headerCells.forEach((cell, i) => {
    if (POSSIBLE_HEADERS.includes(cell as (typeof POSSIBLE_HEADERS)[number])) {
      headerIndices[cell] = i;
    }
  });
  if (!("id" in headerIndices) || !("name" in headerIndices)) {
    console.error("CSV must have 'id' and 'name' columns (tab- or comma-separated). Got:", headerCells.slice(0, 8));
    process.exit(1);
  }
  let imported = 0;
  let skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i], headerIndices, delimiter);
    const rank = row.rank ? parseInt(row.rank, 10) : NaN;
    if (maxRank != null && (!Number.isNaN(rank) && rank > maxRank)) {
      skipped++;
      continue;
    }
    if (excludeExpansions && row.is_expansion === "1") {
      skipped++;
      continue;
    }
    try {
      await upsertFromCsvRow(row);
      imported++;
      if (imported % 1000 === 0) console.log(`Imported ${imported}...`);
    } catch (e) {
      console.error(`Row ${i + 1} (id=${row.id}):`, e);
    }
  }
  console.log(`Done. Imported: ${imported}, skipped: ${skipped}`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
