import { Request, Response, NextFunction } from "express";

export async function register(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(501).json({ message: "Not implemented" });
  } catch (e) {
    next(e);
  }
}

export async function me(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(501).json({ message: "Not implemented" });
  } catch (e) {
    next(e);
  }
}

export async function inviteValidate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(501).json({ message: "Not implemented", code: req.query.code });
  } catch (e) {
    next(e);
  }
}

export async function inviteList(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(501).json({ message: "Not implemented" });
  } catch (e) {
    next(e);
  }
}

export async function inviteCreate(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(501).json({ message: "Not implemented" });
  } catch (e) {
    next(e);
  }
}
