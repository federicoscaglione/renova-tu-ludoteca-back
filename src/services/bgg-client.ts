import { XMLParser } from "fast-xml-parser";

const BGG_BASE = "https://boardgamegeek.com/xmlapi2";
const MIN_DELAY_MS = 5500; // BGG recommends ~5s between requests

function bggHeaders(): Record<string, string> {
  const token = process.env.BGG_API_TOKEN;
  const name = process.env.BGG_API_USERNAME ?? "renovatuludoteca";
  const headers: Record<string, string> = { Accept: "application/xml" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (name) headers["User-Agent"] = name;
  return headers;
}
let lastRequestTime = 0;
const queue: Array<() => Promise<void>> = [];
let processing = false;

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise((r) => setTimeout(r, MIN_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

async function runNext(): Promise<void> {
  if (queue.length === 0) {
    processing = false;
    return;
  }
  processing = true;
  const fn = queue.shift()!;
  try {
    await fn();
  } finally {
    runNext();
  }
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    queue.push(async () => {
      await throttle();
      try {
        const result = await fn();
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
    if (!processing) runNext();
  });
}

export interface BggThingResult {
  bggId: number;
  name: string;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTimeMinutes: number | null;
  description: string | null;
  imageUrl: string | null;
}

/** Get @_value or @_.value from BGG XML parsed node */
function attrValue(obj: unknown): string | undefined {
  if (obj == null) return undefined;
  if (typeof obj === "string") return obj;
  if (typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    if (o["@_value"] != null) return String(o["@_value"]);
    const at = o["@_"] as Record<string, string> | undefined;
    if (at?.value != null) return String(at.value);
  }
  return undefined;
}

function parseItem(item: Record<string, unknown>): BggThingResult | null {
  const attrs = (item["@_"] ?? item) as Record<string, string>;
  const id = attrs?.id;
  if (!id) return null;
  const bggId = Number(id);
  if (Number.isNaN(bggId)) return null;

  const names = item.name;
  let name = "";
  if (Array.isArray(names)) {
    const primary = names.find((n: unknown) => (n as Record<string, unknown>)["@_type"] === "primary");
    name = attrValue(primary) ?? attrValue(names[0]) ?? "";
  } else if (names) {
    name = attrValue(names) ?? "";
  }

  const yearPublished = attrValue(item.yearpublished);
  const minPlayers = attrValue(item.minplayers);
  const maxPlayers = attrValue(item.maxplayers);
  const playingTime = attrValue(item.playingtime);
  const desc = item.description;
  const description = typeof desc === "string" ? desc : undefined;
  const image = item.image;
  const imageUrl = typeof image === "string" ? image : undefined;

  const int = (s: string | undefined) => {
    if (s == null || s === "") return null;
    const n = Number(s);
    return Number.isNaN(n) ? null : Math.floor(n);
  };

  return {
    bggId,
    name: name || "Unknown",
    yearPublished: int(yearPublished),
    minPlayers: int(minPlayers),
    maxPlayers: int(maxPlayers),
    playingTimeMinutes: int(playingTime),
    description: description ?? null,
    imageUrl: imageUrl ?? null,
  };
}

function parseThingXml(xml: string): BggThingResult[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const parsed = parser.parse(xml);
  const items = parsed?.items;
  if (!items) return [];
  const item = items.item;
  if (!item) return [];
  const list = Array.isArray(item) ? item : [item];
  const results: BggThingResult[] = [];
  for (const i of list) {
    const r = parseItem(i as Record<string, unknown>);
    if (r) results.push(r);
  }
  return results;
}

/**
 * Fetch board game details from BGG thing API. Max 20 ids per call. Throttled.
 */
export async function fetchThings(ids: number[]): Promise<BggThingResult[]> {
  if (ids.length === 0) return [];
  const slice = ids.slice(0, 20);
  return enqueue(async () => {
    const url = `${BGG_BASE}/thing?id=${slice.join(",")}&stats=1`;
    const res = await fetch(url, { headers: bggHeaders() });
    if (!res.ok) {
      throw new Error(`BGG API error: ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    return parseThingXml(text);
  });
}

export async function fetchThing(bggId: number): Promise<BggThingResult | null> {
  const list = await fetchThings([bggId]);
  return list[0] ?? null;
}
