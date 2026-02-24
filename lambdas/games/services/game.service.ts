import type { GameItem } from "../../shared/schema";
import type { CreateGameInput, UpdateGameInput } from "../validators";
import { NotFoundError, ForbiddenError, UnauthorizedError } from "../../shared/errors";
import { uuid } from "../../shared/utils";
import * as repo from "../repositories/game.repository";
import { syncToAlgolia } from "./algolia.service";

const algoliaSecretArn = process.env.ALGOLIA_SECRET_ARN;

function requireUserId(userId: string | null): asserts userId is string {
  if (!userId) throw new UnauthorizedError();
}

export async function list(sellerId?: string): Promise<GameItem[]> {
  if (sellerId) return repo.listBySeller(sellerId);
  return repo.listAll();
}

export async function get(gameId: string): Promise<GameItem> {
  const item = await repo.findById(gameId);
  if (!item) throw new NotFoundError("Game not found");
  return item;
}

export async function create(
  userId: string | null,
  body: CreateGameInput
): Promise<GameItem> {
  requireUserId(userId);
  const gameId = uuid();
  const createdAt = new Date().toISOString();
  const item: GameItem = {
    gameId,
    title: body.title,
    description: body.description,
    condition: body.condition,
    price: body.price,
    location: body.location,
    sellerId: userId,
    tags: body.tags,
    images: body.images,
    createdAt,
  };
  await repo.create(item);
  await syncToAlgolia(algoliaSecretArn, item, "save");
  return item;
}

export async function update(
  userId: string | null,
  gameId: string,
  body: UpdateGameInput
): Promise<GameItem> {
  requireUserId(userId);
  const existing = await repo.findById(gameId);
  if (!existing) throw new NotFoundError("Game not found");
  if (existing.sellerId !== userId) throw new ForbiddenError();
  const updates: Partial<GameItem> = {};
  const allowed = ["title", "description", "condition", "price", "location", "tags", "images"] as const;
  for (const k of allowed) {
    if ((body as Record<string, unknown>)[k] !== undefined) {
      (updates as Record<string, unknown>)[k] = (body as Record<string, unknown>)[k];
    }
  }
  if (Object.keys(updates).length === 0) return existing;
  const updated = await repo.update(gameId, updates);
  await syncToAlgolia(algoliaSecretArn, updated, "save");
  return updated;
}

export async function remove(userId: string | null, gameId: string): Promise<void> {
  requireUserId(userId);
  const existing = await repo.findById(gameId);
  if (!existing) throw new NotFoundError("Game not found");
  if (existing.sellerId !== userId) throw new ForbiddenError();
  await repo.remove(gameId);
  await syncToAlgolia(algoliaSecretArn, existing, "delete");
}
