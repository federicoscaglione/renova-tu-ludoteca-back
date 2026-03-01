import { Request, Response, NextFunction } from "express";
import { BadRequestError, NotFoundError } from "../lib/errors";
import * as notificationsRepo from "../repositories/notifications.repository";

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    const unreadOnly = req.query.unreadOnly === "true";
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const rows = await notificationsRepo.listByUser(userId, { unreadOnly, limit, offset });
    res.json({
      notifications: rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        referenceType: n.referenceType ?? undefined,
        referenceId: n.referenceId ?? undefined,
        actionUrl: n.actionUrl ?? undefined,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    next(e);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!id) {
      next(new BadRequestError("ID de notificación requerido."));
      return;
    }
    const n = await notificationsRepo.findById(id);
    if (!n) {
      next(new NotFoundError("Notificación no encontrada."));
      return;
    }
    if (n.userId !== userId) {
      next(new NotFoundError("Notificación no encontrada."));
      return;
    }
    await notificationsRepo.markRead(id, userId);
    res.json({ message: "Marcada como leída." });
  } catch (e) {
    next(e);
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    await notificationsRepo.markAllRead(userId);
    res.json({ message: "Todas marcadas como leídas." });
  } catch (e) {
    next(e);
  }
}
