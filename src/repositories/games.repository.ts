import { eq, desc, and } from "drizzle-orm";
import { db } from "../db/index";
import { games, type Game, type NewGame } from "../db/schema/index";

export async function listAll(publishedOnly?: boolean): Promise<Game[]> {
  if (publishedOnly) {
    return db
      .select()
      .from(games)
      .where(eq(games.isPublished, true))
      .orderBy(desc(games.createdAt));
  }
  return db.select().from(games).orderBy(desc(games.createdAt));
}

export async function listBySeller(sellerId: string, publishedOnly?: boolean): Promise<Game[]> {
  const conditions = publishedOnly
    ? and(eq(games.sellerId, sellerId), eq(games.isPublished, true))
    : eq(games.sellerId, sellerId);
  return db
    .select()
    .from(games)
    .where(conditions)
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setObj: any = { ...updates };
  if (typeof setObj.price === "number") setObj.price = String(setObj.price);
  const rows = await db.update(games).set(setObj).where(eq(games.id, id)).returning();
  if (!rows[0]) throw new Error("Juego no encontrado");
  return rows[0];
}

export async function remove(id: string): Promise<void> {
  await db.delete(games).where(eq(games.id, id));
}
