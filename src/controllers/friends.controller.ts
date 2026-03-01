import { Request, Response, NextFunction } from "express";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../lib/errors";
import * as friendRequestsRepo from "../repositories/friend_requests.repository";
import * as notificationsRepo from "../repositories/notifications.repository";
import { db } from "../db";
import { users } from "../db/schema/users";
import { eq } from "drizzle-orm";

function toPublicUser(row: { id: string; firstName: string; lastName: string; email: string; city: string; createdAt: Date }) {
  return {
    userId: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    name: [row.firstName, row.lastName].filter(Boolean).join(" ") || row.email,
    email: row.email,
    city: row.city,
    location: row.city || "",
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const fromUserId = req.userId;
    if (!fromUserId) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    const toUserId = typeof (req.body as Record<string, unknown>).toUserId === "string"
      ? (req.body as { toUserId: string }).toUserId.trim()
      : "";
    if (!toUserId) {
      next(new BadRequestError("toUserId es requerido."));
      return;
    }
    if (toUserId === fromUserId) {
      next(new BadRequestError("No podés enviarte una solicitud a vos mismo."));
      return;
    }
    const [targetUser] = await db.select().from(users).where(eq(users.id, toUserId)).limit(1);
    if (!targetUser) {
      next(new NotFoundError("Usuario no encontrado."));
      return;
    }
    const existing = await friendRequestsRepo.findBetweenUsers(fromUserId, toUserId);
    if (existing) {
      if (existing.status === "accepted") {
        next(new ConflictError("Ya son amigos."));
        return;
      }
      if (existing.status === "pending") {
        next(new ConflictError("Ya existe una solicitud pendiente."));
        return;
      }
      // status === "rejected": same sender can re-send (update to pending); other direction is a new pair so we fall through and create
      if (existing.fromUserId === fromUserId) {
        await friendRequestsRepo.updateStatus(existing.id, "pending");
        await notificationsRepo.create({
          userId: toUserId,
          type: "friend_request",
          title: "Nueva solicitud de amistad",
          message: `${targetUser.firstName} ${targetUser.lastName} te envió una solicitud de amistad.`,
          referenceType: "friend_request",
          referenceId: existing.id,
          actionUrl: "/profile/friends",
        });
        res.status(201).json({ id: existing.id, message: "Solicitud enviada." });
        return;
      }
      // Other user had sent and we rejected; now we send (different from/to pair) — fall through to create
    }
    const fr = await friendRequestsRepo.create({
      fromUserId,
      toUserId,
      status: "pending",
    });
    await notificationsRepo.create({
      userId: toUserId,
      type: "friend_request",
      title: "Nueva solicitud de amistad",
      message: `${targetUser.firstName} ${targetUser.lastName} te envió una solicitud de amistad.`,
      referenceType: "friend_request",
      referenceId: fr.id,
      actionUrl: "/profile/friends",
    });
    res.status(201).json({ id: fr.id, message: "Solicitud enviada." });
  } catch (e) {
    next(e);
  }
}

export async function listRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    const filter = typeof req.query.filter === "string" ? req.query.filter : "received";
    if (filter !== "sent" && filter !== "received") {
      next(new BadRequestError("filter debe ser 'sent' o 'received'."));
      return;
    }
    if (filter === "sent") {
      const list = await friendRequestsRepo.listSentPending(userId);
      res.json({
        requests: list.map((r) => ({
          id: r.id,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          otherUser: toPublicUser(r.toUser),
        })),
      });
    } else {
      const list = await friendRequestsRepo.listReceivedPending(userId);
      res.json({
        requests: list.map((r) => ({
          id: r.id,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          otherUser: toPublicUser(r.fromUser),
        })),
      });
    }
  } catch (e) {
    next(e);
  }
}

function toPublicUserFromDb(row: { id: string; firstName: string; lastName: string; email: string; city: string; province: string; postalCode: string | null; phone: string; role: string; createdAt: Date }) {
  return {
    userId: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    name: [row.firstName, row.lastName].filter(Boolean).join(" ") || row.email,
    email: row.email,
    city: row.city,
    province: row.province,
    postalCode: row.postalCode ?? undefined,
    phone: row.phone,
    role: row.role,
    location: [row.city, row.province].filter(Boolean).join(", ") || "",
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listFriends(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    const rows = await friendRequestsRepo.listFriendsWithUsers(userId);
    res.json({
      friends: rows.map((row) => toPublicUserFromDb(row)),
    });
  } catch (e) {
    next(e);
  }
}

export async function acceptRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!id) {
      next(new BadRequestError("ID de solicitud requerido."));
      return;
    }
    const fr = await friendRequestsRepo.findById(id);
    if (!fr) {
      next(new NotFoundError("Solicitud no encontrada."));
      return;
    }
    if (fr.toUserId !== userId) {
      next(new ForbiddenError("Solo el destinatario puede aceptar la solicitud."));
      return;
    }
    if (fr.status !== "pending") {
      next(new BadRequestError("La solicitud no está pendiente."));
      return;
    }
    await friendRequestsRepo.updateStatus(id, "accepted");
    const notifs = await notificationsRepo.listByUser(userId, { limit: 500 });
    const n = notifs.find((x) => x.referenceId === id && x.referenceType === "friend_request");
    if (n) await notificationsRepo.markRead(n.id, userId);
    res.json({ message: "Solicitud aceptada." });
  } catch (e) {
    next(e);
  }
}

export async function rejectRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!id) {
      next(new BadRequestError("ID de solicitud requerido."));
      return;
    }
    const fr = await friendRequestsRepo.findById(id);
    if (!fr) {
      next(new NotFoundError("Solicitud no encontrada."));
      return;
    }
    if (fr.toUserId !== userId) {
      next(new ForbiddenError("Solo el destinatario puede rechazar la solicitud."));
      return;
    }
    if (fr.status !== "pending") {
      next(new BadRequestError("La solicitud no está pendiente."));
      return;
    }
    await friendRequestsRepo.updateStatus(id, "rejected");
    const notifs = await notificationsRepo.listByUser(userId, { limit: 500 });
    const n = notifs.find((x) => x.referenceId === id && x.referenceType === "friend_request");
    if (n) await notificationsRepo.markRead(n.id, userId);
    res.json({ message: "Solicitud rechazada." });
  } catch (e) {
    next(e);
  }
}

export async function removeFriend(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    const otherUserId = typeof req.params.userId === "string" ? req.params.userId.trim() : "";
    if (!otherUserId) {
      next(new BadRequestError("ID de usuario requerido."));
      return;
    }
    const existing = await friendRequestsRepo.findBetweenUsers(userId, otherUserId);
    if (!existing || existing.status !== "accepted") {
      next(new NotFoundError("No son amigos."));
      return;
    }
    await friendRequestsRepo.removeFriendship(userId, otherUserId);
    res.json({ message: "Amigo eliminado." });
  } catch (e) {
    next(e);
  }
}
