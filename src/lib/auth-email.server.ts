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

export function buildAuthEmailContent(
  recipient: AuthEmailRecipient,
  type: AuthTokenType,
  token: string,
  manualCode: string,
) {
  const link = authLink(type, token);
  const invitation = type === "INVITATION";
  const subject = invitation ? "Activez votre compte Presence Plus" : "Réinitialisez votre mot de passe Presence Plus";
  const action = invitation ? "Activer mon compte" : "Choisir un nouveau mot de passe";
  const expiry = invitation ? "48 heures" : "30 minutes";
  const introduction = invitation
    ? "Votre compte Presence Plus a été créé. Définissez votre mot de passe pour l’activer."
    : "Une demande de réinitialisation de votre mot de passe a été reçue.";
  const text = [
    `Bonjour ${recipient.name},`,
    "",
    introduction,
    "",
    `${action} : ${link}`,
    "",
    `Code à usage unique : ${manualCode}`,
    "Saisissez ce code avec votre adresse e-mail si le lien ne s’ouvre pas.",
    "",
    `Le lien et le code sont personnels, utilisables une seule fois et expirent dans ${expiry}.`,
    "Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.",
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;color:#17211d;line-height:1.6;max-width:600px;margin:0 auto">
      <h1 style="font-size:24px">Presence Plus</h1>
      <p>Bonjour ${escapeHtml(recipient.name)},</p>
      <p>${introduction}</p>
      <p><a href="${escapeHtml(link)}" style="display:inline-block;background:#176b52;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px">${action}</a></p>
      <div style="margin:24px 0;padding:16px;border:1px solid #d8e2dd;border-radius:6px;background:#f7faf8">
        <p style="margin:0 0 6px;font-size:13px;color:#52615a">Code à usage unique</p>
        <p style="margin:0;font-family:Consolas,Monaco,monospace;font-size:24px;font-weight:700;letter-spacing:2px">${escapeHtml(manualCode)}</p>
        <p style="margin:8px 0 0;font-size:13px;color:#52615a">Utilisez ce code avec votre adresse e-mail si le lien ne s’ouvre pas.</p>
      </div>
      <p>Le lien et le code sont personnels, utilisables une seule fois et expirent dans ${expiry}.</p>
      <p style="color:#66736d;font-size:13px">Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.</p>
    </div>`;

  return { subject, html, text };
}

export async function sendAuthEmail(
  recipient: AuthEmailRecipient,
  type: AuthTokenType,
  token: string,
  manualCode: string,
  idempotencyKey: string,
): Promise<AuthEmailResult> {
  const { subject, html, text } = buildAuthEmailContent(recipient, type, token, manualCode);

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
  manualCode: string,
  actorId: string | null,
) {
  const result = await sendAuthEmail(recipient, type, token, manualCode, `${type.toLocaleLowerCase()}:${tokenId}`)
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
        metadata: {
          type,
          ...(result.providerHttpStatus ? { providerHttpStatus: result.providerHttpStatus } : {}),
          ...(result.providerErrorCode ? { providerErrorCode: result.providerErrorCode } : {}),
        },
      },
    }),
  ]).catch(() => undefined);
  return result;
}
