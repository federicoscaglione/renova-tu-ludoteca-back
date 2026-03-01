import type { Game } from "../db/schema/index";
import type { CreateGameInput, UpdateGameInput } from "../validators/games.validators";
import { NotFoundError, ForbiddenError, UnauthorizedError } from "../lib/errors";
import * as repo from "../repositories/games.repository";
import * as catalogRepo from "../repositories/game_catalog.repository";

function requireUserId(userId: string | null): asserts userId is string {
  if (!userId) throw new UnauthorizedError();
}

export type GameWithCatalog = Game & { catalogGame?: Awaited<ReturnType<typeof catalogRepo.findById>> };

export async function list(sellerId?: string, publishedOnly?: boolean): Promise<Game[]> {
  if (sellerId) return repo.listBySeller(sellerId, publishedOnly);
  return repo.listAll(publishedOnly);
}

export async function get(id: string): Promise<GameWithCatalog> {
  const item = await repo.findById(id);
  if (!item) throw new NotFoundError("Juego no encontrado");
  const catalogGame = item.catalogGameId
    ? await catalogRepo.findById(item.catalogGameId)
    : undefined;
  return { ...item, catalogGame: catalogGame ?? undefined };
}

export async function create(userId: string | null, body: CreateGameInput): Promise<Game> {
  requireUserId(userId);
  let title = body.title;
  let description = body.description ?? "";
  if (body.catalogGameId) {
    const catalog = await catalogRepo.findById(body.catalogGameId);
    if (catalog) {
      title = catalog.name;
      description = catalog.description ?? description;
    }
  }
  return repo.create({
    catalogGameId: body.catalogGameId ?? null,
    title,
    description,
    condition: body.condition,
    price: String(body.price),
    location: body.location,
    sellerId: userId,
    tags: body.tags,
    images: body.images,
    isPublished: body.isPublished ?? false,
  });
}

export async function update(
  userId: string | null,
  id: string,
  body: UpdateGameInput
): Promise<Game> {
  requireUserId(userId);
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("Juego no encontrado");
  if (existing.sellerId !== userId) throw new ForbiddenError();
  const updates: Partial<Record<string, unknown>> = {};
  const allowed = ["title", "description", "condition", "price", "location", "tags", "images", "catalogGameId", "isPublished"] as const;
  for (const k of allowed) {
    if ((body as Record<string, unknown>)[k] !== undefined) {
      updates[k] = (body as Record<string, unknown>)[k];
    }
  }
  if (Object.keys(updates).length === 0) return existing;
  if (typeof updates.price === "number") updates.price = String(updates.price);
  return repo.update(id, updates as Parameters<typeof repo.update>[1]);
}

export async function remove(userId: string | null, id: string): Promise<void> {
  requireUserId(userId);
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("Juego no encontrado");
  if (existing.sellerId !== userId) throw new ForbiddenError();
  await repo.remove(id);
}
