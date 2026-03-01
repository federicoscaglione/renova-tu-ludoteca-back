import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { logger } from "../lib/logger";

const sesClient = new SESClient({
  region: process.env.AWS_REGION ?? process.env.COGNITO_REGION ?? "us-east-1",
});

/**
 * Envía el email de invitación al destinatario con el enlace de registro.
 * Requiere: FRONTEND_URL (base URL del front, ej. https://app.ejemplo.com), SES_FROM_EMAIL (email verificado en SES).
 */
export async function sendInvitationEmail(params: {
  toEmail: string;
  invitationCode: string;
}): Promise<void> {
  const { toEmail, invitationCode } = params;
  const frontendUrl = process.env.FRONTEND_URL?.trim();
  const fromEmail = process.env.SES_FROM_EMAIL?.trim();

  if (!frontendUrl) {
    logger.warn("FRONTEND_URL no configurado; no se envía email de invitación");
    throw new Error("Configuración de email incompleta: falta FRONTEND_URL");
  }
  if (!fromEmail) {
    logger.warn("SES_FROM_EMAIL no configurado; no se envía email de invitación");
    throw new Error("Configuración de email incompleta: falta SES_FROM_EMAIL");
  }

  const registerLink = `${frontendUrl.replace(/\/$/, "")}/register?code=${encodeURIComponent(invitationCode)}`;
  const subject = "Invitación a Renova tu Ludoteca";
  const textBody = `Te han invitado a unirte a Renova tu Ludoteca.\n\nPara crear tu cuenta, ingresá a este enlace:\n${registerLink}\n\nSi no esperabas esta invitación, podés ignorar este correo.`;
  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.5;">
  <p>Te han invitado a unirte a <strong>Renova tu Ludoteca</strong>.</p>
  <p>Para crear tu cuenta, hacé clic en el siguiente enlace:</p>
  <p><a href="${registerLink}" style="color: #6d28d9;">Crear mi cuenta</a></p>
  <p>O copiá y pegá esta URL en tu navegador:</p>
  <p style="word-break: break-all;">${registerLink}</p>
  <p style="color: #666;">Si no esperabas esta invitación, podés ignorar este correo.</p>
</body>
</html>`;

  const command = new SendEmailCommand({
    Source: fromEmail,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: {
        Text: { Data: textBody, Charset: "UTF-8" },
        Html: { Data: htmlBody, Charset: "UTF-8" },
      },
    },
  });

  try {
    await sesClient.send(command);
    logger.info({ toEmail }, "Email de invitación enviado");
  } catch (err) {
    logger.error({ err, toEmail }, "Error al enviar email de invitación por SES");
    throw err;
  }
}
