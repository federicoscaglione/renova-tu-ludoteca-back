import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { invitations } from "../db/schema/invitations";
import type { NewInvitation } from "../db/schema/invitations";

export async function findByCode(code: string) {
  const [row] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.invitationCode, code))
    .limit(1);
  return row ?? null;
}

export async function create(data: NewInvitation) {
  const [row] = await db.insert(invitations).values(data).returning();
  return row!;
}

export async function markUsed(code: string, usedBy: string) {
  await db
    .update(invitations)
    .set({ used: true, usedBy })
    .where(eq(invitations.invitationCode, code));
}

export async function listByInviter(inviterId: string) {
  return db
    .select({
      id: invitations.id,
      inviteeEmail: invitations.inviteeEmail,
      invitationCode: invitations.invitationCode,
      used: invitations.used,
      createdAt: invitations.createdAt,
    })
    .from(invitations)
    .where(eq(invitations.inviterId, inviterId))
    .orderBy(desc(invitations.createdAt));
}
