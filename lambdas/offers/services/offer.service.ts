import type { OfferItem } from "../../shared/schema";
import type { CreateOfferInput, UpdateOfferInput } from "../validators";
import {
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  BadRequestError,
} from "../../shared/errors";
import { uuid } from "../../shared/utils";
import * as offerRepo from "../repositories/offer.repository";
import * as gameRepo from "../../games/repositories/game.repository";

function requireUserId(userId: string | null): asserts userId is string {
  if (!userId) throw new UnauthorizedError();
}

export async function list(
  userId: string | null,
  gameId?: string
): Promise<OfferItem[]> {
  requireUserId(userId);
  if (gameId) return offerRepo.listByGame(gameId);
  return offerRepo.listByUser(userId);
}

export async function get(userId: string | null, offerId: string): Promise<OfferItem> {
  requireUserId(userId);
  const item = await offerRepo.findById(offerId);
  if (!item) throw new NotFoundError("Offer not found");
  if (item.buyerId !== userId && item.sellerId !== userId) {
    throw new ForbiddenError();
  }
  return item;
}

export async function create(
  userId: string | null,
  body: CreateOfferInput
): Promise<OfferItem> {
  requireUserId(userId);
  const game = await gameRepo.findById(body.gameId);
  if (!game) throw new NotFoundError("Game not found");
  if (game.sellerId === userId) {
    throw new BadRequestError("Cannot offer on your own game");
  }
  const offerId = uuid();
  const createdAt = new Date().toISOString();
  const item: OfferItem = {
    offerId,
    gameId: body.gameId,
    buyerId: userId,
    sellerId: game.sellerId,
    price: Number(body.price),
    message: body.message ?? "",
    status: "pending",
    createdAt,
  };
  await offerRepo.create(item);
  return item;
}

export async function update(
  userId: string | null,
  offerId: string,
  body: UpdateOfferInput
): Promise<OfferItem> {
  requireUserId(userId);
  const existing = await offerRepo.findById(offerId);
  if (!existing) throw new NotFoundError("Offer not found");
  if (existing.sellerId !== userId && existing.buyerId !== userId) {
    throw new ForbiddenError();
  }
  const updates: { status?: string; price?: number; message?: string } = {};
  if (
    body?.status &&
    ["accepted", "rejected", "completed"].includes(body.status)
  ) {
    if (body.status === "accepted" || body.status === "rejected") {
      if (existing.sellerId !== userId) {
        throw new ForbiddenError("Only seller can accept/reject");
      }
    }
    updates.status = body.status;
  }
  if (body?.price != null && existing.sellerId === userId) {
    updates.price = body.price;
  }
  if (body?.message !== undefined) {
    updates.message = body.message;
  }
  if (Object.keys(updates).length === 0) return existing;
  return offerRepo.update(offerId, updates);
}

export async function remove(userId: string | null, offerId: string): Promise<void> {
  requireUserId(userId);
  const existing = await offerRepo.findById(offerId);
  if (!existing) throw new NotFoundError("Offer not found");
  if (existing.buyerId !== userId) throw new ForbiddenError();
  await offerRepo.remove(offerId);
}
