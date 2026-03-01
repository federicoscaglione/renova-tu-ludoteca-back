import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../db";
import { users } from "../db/schema/users";
import { logger } from "../lib/logger";
import { BadRequestError, ConflictError } from "../lib/errors";
import * as invitationsRepo from "../repositories/invitations.repository";
import { createCognitoUser } from "../services/cognito-admin";

const ALLOWED_UPDATE_FIELDS = [
  "firstName",
  "lastName",
  "phone",
  "address",
  "city",
  "province",
  "provinceId",
  "localityId",
  "department",
  "municipality",
  "postalCode",
] as const;

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const invitationCode = typeof body.invitationCode === "string" ? body.invitationCode.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const dni = typeof body.dni === "string" ? body.dni.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const province = typeof body.province === "string" ? body.province.trim() : "";
    const provinceId = typeof body.provinceId === "string" ? body.provinceId.trim() || null : null;
    const localityId = typeof body.localityId === "string" ? body.localityId.trim() || null : null;
    const department = typeof body.department === "string" ? body.department.trim() || null : null;
    const municipality = typeof body.municipality === "string" ? body.municipality.trim() || null : null;
    const postalCode = typeof body.postalCode === "string" ? body.postalCode.trim() : undefined;

    if (!invitationCode || !email || !password || !firstName || !lastName || !dni) {
      next(new BadRequestError("Faltan campos obligatorios: código de invitación, email, contraseña, nombre, apellido o DNI."));
      return;
    }
    if (password.length < 8) {
      next(new BadRequestError("La contraseña debe tener al menos 8 caracteres."));
      return;
    }

    const inv = await invitationsRepo.findByCode(invitationCode);
    if (!inv) {
      next(new BadRequestError("Código de invitación inválido o vencido."));
      return;
    }
    if (inv.used) {
      next(new BadRequestError("Esta invitación ya fue usada."));
      return;
    }
    if (inv.inviteeEmail.toLowerCase() !== email) {
      next(new BadRequestError("El email no coincide con el de la invitación."));
      return;
    }

    const cognitoSub = await createCognitoUser({ email, password, firstName, lastName });

    await db.insert(users).values({
      id: cognitoSub,
      dni,
      firstName,
      lastName,
      email,
      phone: phone || "",
      address: address || "",
      city: city || "",
      province: province || "",
      provinceId,
      localityId,
      department,
      municipality,
      postalCode: postalCode ?? null,
      role: "normal",
    });

    await invitationsRepo.markUsed(invitationCode, cognitoSub);

    res.status(201).json({ message: "Usuario creado. Ya podés iniciar sesión." });
  } catch (e) {
    if (e && typeof e === "object" && "name" in e && (e as { name: string }).name === "UsernameExistsException") {
      next(new ConflictError("Ya existe una cuenta con ese email."));
      return;
    }
    if (e && typeof e === "object" && "name" in e && (e as { name: string }).name === "InvalidParameterException") {
      next(new BadRequestError("Datos inválidos. Revisá la contraseña (mín. 8 caracteres, mayúscula, minúscula y número)."));
      return;
    }
    next(e);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    const dbStart = Date.now();
    const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const dbMs = Date.now() - dbStart;
    logger.info({ dbMs }, "/api/me: consulta DB");
    if (!row) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    res.json({
      userId: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      city: row.city,
      province: row.province,
      provinceId: row.provinceId ?? undefined,
      localityId: row.localityId ?? undefined,
      department: row.department ?? undefined,
      municipality: row.municipality ?? undefined,
      postalCode: row.postalCode ?? undefined,
      phone: row.phone,
      dni: row.dni,
      address: row.address,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (e) {
    next(e);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, string> = {};
    for (const key of ALLOWED_UPDATE_FIELDS) {
      const v = body[key];
      if (v === undefined) continue;
      if (typeof v !== "string") {
        next(new BadRequestError(`El campo ${key} debe ser texto.`));
        return;
      }
      if (key === "postalCode") {
        updates[key] = v.trim() || "";
      } else {
        updates[key] = v.trim();
      }
    }
    if (Object.keys(updates).length === 0) {
      res.json({ message: "Nada que actualizar" });
      return;
    }
    if (updates.firstName !== undefined && !updates.firstName) {
      next(new BadRequestError("El nombre no puede estar vacío."));
      return;
    }
    if (updates.lastName !== undefined && !updates.lastName) {
      next(new BadRequestError("El apellido no puede estar vacío."));
      return;
    }
    const dbUpdates: Record<string, string | null> = {};
    if (updates.firstName !== undefined) dbUpdates.firstName = updates.firstName;
    if (updates.lastName !== undefined) dbUpdates.lastName = updates.lastName;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.province !== undefined) dbUpdates.province = updates.province;
    if (updates.postalCode !== undefined) dbUpdates.postalCode = updates.postalCode || null;
    if (updates.provinceId !== undefined) dbUpdates.provinceId = updates.provinceId || null;
    if (updates.localityId !== undefined) dbUpdates.localityId = updates.localityId || null;
    if (updates.department !== undefined) dbUpdates.department = updates.department || null;
    if (updates.municipality !== undefined) dbUpdates.municipality = updates.municipality || null;
    await db.update(users).set(dbUpdates).where(eq(users.id, userId));
    res.json({ message: "Perfil actualizado" });
  } catch (e) {
    next(e);
  }
}

export async function inviteValidate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const code = typeof req.query.code === "string" ? req.query.code.trim() : "";
    if (!code) {
      res.json({ valid: false });
      return;
    }
    const inv = await invitationsRepo.findByCode(code);
    if (!inv || inv.used) {
      res.json({ valid: false });
      return;
    }
    res.json({ valid: true, inviteeEmail: inv.inviteeEmail });
  } catch (e) {
    next(e);
  }
}

export async function inviteList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    const list = await invitationsRepo.listByInviter(userId);
    res.json({
      invitations: list.map((row) => ({
        id: row.id,
        inviteeEmail: row.inviteeEmail,
        invitationCode: row.invitationCode,
        used: row.used,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    next(e);
  }
}

export async function inviteCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    const email = typeof (req.body as Record<string, unknown>).email === "string"
      ? (req.body as { email: string }).email.trim().toLowerCase()
      : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next(new BadRequestError("Email inválido."));
      return;
    }

    const code = randomUUID();
    await invitationsRepo.create({
      invitationCode: code,
      inviterId: userId,
      inviteeEmail: email,
    });

    res.status(201).json({ invitationCode: code });
  } catch (e) {
    next(e);
  }
}
