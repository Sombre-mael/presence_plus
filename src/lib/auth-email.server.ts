import "server-only";

import type { AuthTokenType } from "@/generated/prisma/client";
import {
  sendTransactionalAuthEmail,
  type AuthEmailRecipient,
  type AuthEmailResult,
} from "@/lib/auth-email-transport.server";
import { prisma } from "@/lib/prisma";

export type { AuthEmailRecipient, AuthEmailResult } from "@/lib/auth-email-transport.server";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function publicUrl() {
  return process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "") || "http://localhost:3000";
}

export function authActionPath(type: AuthTokenType, token: string) {
  const path = type === "INVITATION" ? "/activate-account" : "/reset-password";
  return `${path}?token=${encodeURIComponent(token)}`;
}

export function authLink(type: AuthTokenType, token: string) {
  return `${publicUrl()}${authActionPath(type, token)}`;
}

export async function sendAuthEmail(
  recipient: AuthEmailRecipient,
  type: AuthTokenType,
  token: string,
  idempotencyKey: string,
): Promise<AuthEmailResult> {
  const link = authLink(type, token);
  const invitation = type === "INVITATION";
  const subject = invitation ? "Activez votre compte Presence Plus" : "Réinitialisez votre mot de passe Presence Plus";
  const action = invitation ? "Activer mon compte" : "Choisir un nouveau mot de passe";
  const expiry = invitation ? "48 heures" : "30 minutes";
  const text = [
    `Bonjour ${recipient.name},`,
    "",
    invitation
      ? "Votre compte Presence Plus a été créé. Définissez votre mot de passe pour l’activer."
      : "Une demande de réinitialisation de votre mot de passe a été reçue.",
    "",
    `${action} : ${link}`,
    "",
    `Ce lien est personnel, utilisable une seule fois et expire dans ${expiry}.`,
    "Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.",
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;color:#17211d;line-height:1.6;max-width:600px;margin:0 auto">
      <h1 style="font-size:24px">Presence Plus</h1>
      <p>Bonjour ${escapeHtml(recipient.name)},</p>
      <p>${invitation
        ? "Votre compte a été créé. Définissez votre mot de passe pour l’activer."
        : "Une demande de réinitialisation de votre mot de passe a été reçue."}</p>
      <p><a href="${escapeHtml(link)}" style="display:inline-block;background:#176b52;color:#fff;padding:12px 18px;text-decoration:none">${action}</a></p>
      <p>Ce lien est personnel, utilisable une seule fois et expire dans ${expiry}.</p>
      <p style="color:#66736d;font-size:13px">Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.</p>
    </div>`;

  return sendTransactionalAuthEmail({
    recipient,
    subject,
    html,
    text,
    idempotencyKey,
  });
}

export async function deliverAuthEmail(
  tokenId: string,
  recipient: AuthEmailRecipient,
  type: AuthTokenType,
  token: string,
  actorId: string | null,
) {
  const result = await sendAuthEmail(recipient, type, token, `${type.toLocaleLowerCase()}:${tokenId}`)
    .catch((): AuthEmailResult => ({ sent: false, simulated: false, status: "FAILED", message: "L’e-mail n’a pas pu être envoyé." }));
  await prisma.$transaction([
    prisma.authToken.update({
      where: { id: tokenId },
      data: { deliveryStatus: result.status, providerMessageId: result.providerMessageId, deliveryAttemptedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        actorId,
        action: `AUTH_EMAIL_${result.status}`,
        entityType: "AuthToken",
        entityId: tokenId,
        metadata: { type },
      },
    }),
  ]).catch(() => undefined);
  return result;
}
