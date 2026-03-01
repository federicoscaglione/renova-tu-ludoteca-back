import { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../lib/errors";
import * as catalogService from "../services/game_catalog.service";

export async function search(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const page = typeof req.query.page === "string" ? parseInt(req.query.page, 10) : undefined;
    const pageSize = typeof req.query.pageSize === "string" ? parseInt(req.query.pageSize, 10) : undefined;
    const excludeExpansions = req.query.excludeExpansions === "1" || req.query.excludeExpansions === "true";
    const result = await catalogService.search({ q, page, pageSize, excludeExpansions });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) {
      next(new BadRequestError("Falta el id"));
      return;
    }
    const entry = await catalogService.getById(id);
    res.json(entry);
  } catch (e) {
    next(e);
  }
}

export async function syncFromBgg(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as { bggId?: number };
    const bggId = body?.bggId;
    if (typeof bggId !== "number" || !Number.isInteger(bggId) || bggId < 1) {
      next(new BadRequestError("bggId debe ser un número entero positivo"));
      return;
    }
    const entry = await catalogService.syncFromBgg(bggId);
    res.status(201).json(entry);
  } catch (e) {
    next(e);
  }
}
