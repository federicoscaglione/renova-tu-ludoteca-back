import type { Game } from "../db/schema/index.js";
import type { CreateGameInput, UpdateGameInput } from "../validators/games.validators.js";
import { NotFoundError, ForbiddenError, UnauthorizedError } from "../lib/errors.js";
import * as repo from "../repositories/games.repository.js";

function requireUserId(userId: string | null): asserts userId is string {
  if (!userId) throw new UnauthorizedError();
}

export async function list(sellerId?: string): Promise<Game[]> {
  if (sellerId) return repo.listBySeller(sellerId);
  return repo.listAll();
}

export async function get(id: string): Promise<Game> {
  const item = await repo.findById(id);
  if (!item) throw new NotFoundError("Game not found");
  return item;
}

export async function create(userId: string | null, body: CreateGameInput): Promise<Game> {
  requireUserId(userId);
  return repo.create({
    title: body.title,
    description: body.description,
    condition: body.condition,
    price: String(body.price),
    location: body.location,
    sellerId: userId,
    tags: body.tags,
    images: body.images,
  });
}

export async function update(
  userId: string | null,
  id: string,
  body: UpdateGameInput
): Promise<Game> {
  requireUserId(userId);
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("Game not found");
  if (existing.sellerId !== userId) throw new ForbiddenError();
  const updates: Partial<Record<string, unknown>> = {};
  const allowed = ["title", "description", "condition", "price", "location", "tags", "images"] as const;
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
  if (!existing) throw new NotFoundError("Game not found");
  if (existing.sellerId !== userId) throw new ForbiddenError();
  await repo.remove(id);
}
