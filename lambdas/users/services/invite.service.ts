import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import type { InvitationItem } from "../../shared/schema";
import { BadRequestError } from "../../shared/errors";
import * as invitationRepository from "../repositories/invitation.repository";
import type { CreateInvitationInput } from "../validators";

const ses = new SESClient({});

function getFromEmail(): string {
  const email = process.env.INVITATION_FROM_EMAIL;
  if (!email) throw new Error("INVITATION_FROM_EMAIL not set");
  return email;
}

function getFrontendUrl(): string {
  const url = process.env.FRONTEND_URL;
  if (!url) throw new Error("FRONTEND_URL not set");
  return url.replace(/\/$/, "");
}

function generateInvitationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const array = new Uint8Array(12);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 12; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  for (let i = 0; i < 12; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}

export async function createInvitation(
  inviterId: string,
  input: CreateInvitationInput
): Promise<{ invitationCode: string }> {
  const code = generateInvitationCode();
  const now = new Date().toISOString();

  const item: InvitationItem = {
    pk: `INVITATION#${code}`,
    sk: `INVITATION#${code}`,
    invitationCode: code,
    inviterId,
    inviteeEmail: input.email,
    createdAt: now,
    used: false,
  };

  await invitationRepository.create(item);

  const frontendUrl = getFrontendUrl();
  const registerLink = `${frontendUrl}/register?code=${code}`;
  const fromEmail = getFromEmail();

  await ses.send(
    new SendEmailCommand({
      Source: fromEmail,
      Destination: { ToAddresses: [input.email] },
      Message: {
        Subject: {
          Data: "Invitación a Renova Tu Ludoteca",
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: `
              <p>Has sido invitado a unirte a Renova Tu Ludoteca.</p>
              <p>Haz clic en el siguiente enlace para crear tu cuenta:</p>
              <p><a href="${registerLink}">${registerLink}</a></p>
              <p>Si no esperabas esta invitación, puedes ignorar este correo.</p>
            `,
            Charset: "UTF-8",
          },
        },
      },
    })
  );

  return { invitationCode: code };
}

export async function listInvitations(inviterId: string): Promise<InvitationItem[]> {
  return invitationRepository.listByInviter(inviterId);
}

export async function validateCode(code: string): Promise<{
  valid: boolean;
  inviteeEmail?: string;
}> {
  if (!code || !code.trim()) {
    return { valid: false };
  }
  const invitation = await invitationRepository.getByCode(code.trim());
  if (!invitation || invitation.used) {
    return { valid: false };
  }
  return { valid: true, inviteeEmail: invitation.inviteeEmail };
}
