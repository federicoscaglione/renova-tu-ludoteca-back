import { Request, Response, NextFunction } from "express";

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(501).json({ error: "No implementado" });
  } catch (e) {
    next(e);
  }
}

export async function get(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(501).json({ error: "No implementado", id: req.params.id });
  } catch (e) {
    next(e);
  }
}

export async function create(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(501).json({ error: "No implementado" });
  } catch (e) {
    next(e);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(501).json({ error: "No implementado", id: req.params.id });
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(501).json({ error: "No implementado", id: req.params.id });
  } catch (e) {
    next(e);
  }
}
