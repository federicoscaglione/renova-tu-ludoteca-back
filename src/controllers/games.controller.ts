import { Request, Response, NextFunction } from "express";
import { createGameSchema, updateGameSchema } from "../validators/games.validators.js";
import { BadRequestError } from "../lib/errors.js";
import * as gamesService from "../services/games.service.js";

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sellerId = typeof req.query.sellerId === "string" ? req.query.sellerId : undefined;
    const games = await gamesService.list(sellerId);
    res.json({ games });
  } catch (e) {
    next(e);
  }
}

export async function get(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) {
      next(new BadRequestError("Missing id"));
      return;
    }
    const game = await gamesService.get(id);
    res.json(game);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createGameSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new BadRequestError(parsed.error.flatten().formErrors.join("; ") || "Validation failed"));
      return;
    }
    const game = await gamesService.create(req.userId ?? null, parsed.data);
    res.status(201).json(game);
  } catch (e) {
    next(e);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) {
      next(new BadRequestError("Missing id"));
      return;
    }
    const parsed = updateGameSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new BadRequestError(parsed.error.flatten().formErrors.join("; ") || "Validation failed"));
      return;
    }
    const game = await gamesService.update(req.userId ?? null, id, parsed.data);
    res.json(game);
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) {
      next(new BadRequestError("Missing id"));
      return;
    }
    await gamesService.remove(req.userId ?? null, id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
