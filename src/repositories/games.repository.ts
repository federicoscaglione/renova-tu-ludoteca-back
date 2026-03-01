import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { games, type Game, type NewGame } from "../db/schema/index.js";

export async function listAll(): Promise<Game[]> {
  return db.select().from(games).orderBy(desc(games.createdAt));
}

export async function listBySeller(sellerId: string): Promise<Game[]> {
  return db
    .select()
    .from(games)
    .where(eq(games.sellerId, sellerId))
    .orderBy(desc(games.createdAt));
}

export async function findById(id: string): Promise<Game | null> {
  const rows = await db.select().from(games).where(eq(games.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function create(item: NewGame): Promise<Game> {
  const rows = await db.insert(games).values(item).returning();
  return rows[0];
}

export async function update(
  id: string,
  updates: Partial<Omit<NewGame, "id" | "sellerId" | "createdAt">>
): Promise<Game> {
  const rows = await db.update(games).set(updates).where(eq(games.id, id)).returning();
  if (!rows[0]) throw new Error("Game not found");
  return rows[0];
}

export async function remove(id: string): Promise<void> {
  await db.delete(games).where(eq(games.id, id));
}
