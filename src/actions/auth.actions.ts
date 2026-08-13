"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedViewer, getViewerForRole } from "@/lib/authenticated-viewer";
import { consumeRecoveryAttempt } from "@/lib/auth-throttle.server";
import { currentClientIp } from "@/lib/auth-request.server";
import { issueAuthToken, inspectAuthToken } from "@/lib/auth-token.server";
import { normalizeIdentifier } from "@/lib/auth-crypto.server";
import { sendAuthEmail } from "@/lib/auth-email.server";
import { evaluatePassword } from "@/lib/password-policy";
import { SERIALIZABLE_TRANSACTION_OPTIONS } from "@/lib/transaction-options";

export interface AuthActionResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

const GENERIC_RECOVERY_MESSAGE = "Si un compte actif correspond à cet identifiant, un lien de réinitialisation vient d’être envoyé.";

function passwordValidation(
  password: string,
  confirmation: string,
  identity: string[],
): AuthActionResult | null {
  if (password !== confirmation) {
    return { ok: false, message: "Les mots de passe ne correspondent pas.", fieldErrors: { confirmation: "Saisissez le même mot de passe." } };
  }
  const policy = evaluatePassword(password, identity);
  if (!policy.valid) {
    return { ok: false, message: "Le mot de passe ne respecte pas la politique de sécurité.", fieldErrors: { password: policy.errors.join(" ") } };
  }
  return null;
}

export async function requestPasswordResetAction(identifierValue: string): Promise<AuthActionResult> {
  const identifier = normalizeIdentifier(identifierValue);
  if (!identifier || identifier.length > 160) return { ok: true, message: GENERIC_RECOVERY_MESSAGE };
  const ip = await currentClientIp();
  if (!await consumeRecoveryAttempt(identifier, ip)) return { ok: true, message: GENERIC_RECOVERY_MESSAGE };

  const user = await prisma.user.findFirst({
    where: {
      status: "ACTIVE",
      activatedAt: { not: null },
      OR: [
        { email: { equals: identifier, mode: "insensitive" } },
        { matricule: { equals: identifier, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true },
  });
  if (!user) return { ok: true, message: GENERIC_RECOVERY_MESSAGE };

  const issued = await prisma.$transaction(async (tx) => {
    const token = await issueAuthToken(user.id, "PASSWORD_RESET", tx);
    await tx.auditLog.create({
      data: { actorId: user.id, action: "REQUEST_PASSWORD_RESET", entityType: "User", entityId: user.id },
    });
    return token;
  }, SERIALIZABLE_TRANSACTION_OPTIONS);
  await sendAuthEmail(user, "PASSWORD_RESET", issued.token, `password-reset:${issued.id}`).catch(() => undefined);
  return { ok: true, message: GENERIC_RECOVERY_MESSAGE };
}

async function consumeTokenAndSetPassword(
  token: string,
  type: "INVITATION" | "PASSWORD_RESET",
  password: string,
  confirmation: string,
): Promise<AuthActionResult> {
  const inspected = await inspectAuthToken(token, type);
  if (!inspected || inspected.user.status !== "ACTIVE") {
    return { ok: false, message: "Ce lien est invalide, expiré ou déjà utilisé." };
  }
  const validation = passwordValidation(password, confirmation, [inspected.user.name, inspected.user.email, inspected.user.matricule ?? ""]);
  if (validation) return validation;
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.authToken.updateMany({
        where: { id: inspected.id, type, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) throw new Error("TOKEN_CONSUMED");
      await tx.user.update({
        where: { id: inspected.user.id },
        data: {
          passwordHash,
          activatedAt: inspected.user.activatedAt ?? now,
          mustChangePassword: false,
          passwordChangedAt: now,
          sessionVersion: { increment: 1 },
        },
      });
      await tx.authToken.updateMany({
        where: { userId: inspected.user.id, usedAt: null },
        data: { usedAt: now },
      });
      await tx.auditLog.create({
        data: {
          actorId: inspected.user.id,
          action: type === "INVITATION" ? "ACTIVATE_ACCOUNT" : "RESET_PASSWORD",
          entityType: "User",
          entityId: inspected.user.id,
        },
      });
    }, SERIALIZABLE_TRANSACTION_OPTIONS);
  } catch {
    return { ok: false, message: "Ce lien est invalide, expiré ou déjà utilisé." };
  }
  return { ok: true, message: type === "INVITATION" ? "Votre compte est activé. Vous pouvez vous connecter." : "Votre mot de passe a été modifié. Vous pouvez vous connecter." };
}

export async function activateAccountAction(token: string, password: string, confirmation: string) {
  return consumeTokenAndSetPassword(token, "INVITATION", password, confirmation);
}

export async function resetPasswordAction(token: string, password: string, confirmation: string) {
  return consumeTokenAndSetPassword(token, "PASSWORD_RESET", password, confirmation);
}

export async function changeOwnPasswordAction(
  currentPassword: string,
  password: string,
  confirmation: string,
): Promise<AuthActionResult> {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) return { ok: false, message: "Votre session a expiré. Reconnectez-vous." };
  const user = await prisma.user.findUnique({
    where: { id: viewer.id },
    select: { passwordHash: true, name: true, email: true, matricule: true },
  });
  if (!user || !await bcrypt.compare(currentPassword, user.passwordHash)) {
    return { ok: false, message: "Le mot de passe actuel est incorrect.", fieldErrors: { currentPassword: "Vérifiez votre mot de passe actuel." } };
  }
  if (await bcrypt.compare(password, user.passwordHash)) {
    return { ok: false, message: "Choisissez un mot de passe différent.", fieldErrors: { password: "Le nouveau mot de passe doit être différent de l’actuel." } };
  }
  const validation = passwordValidation(password, confirmation, [user.name, user.email, user.matricule ?? ""]);
  if (validation) return validation;
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: viewer.id },
      data: { passwordHash, mustChangePassword: false, passwordChangedAt: new Date(), sessionVersion: { increment: 1 } },
    }),
    prisma.auditLog.create({ data: { actorId: viewer.id, action: "CHANGE_PASSWORD", entityType: "User", entityId: viewer.id } }),
  ]);
  return { ok: true, message: "Mot de passe modifié. Reconnectez-vous avec votre nouveau mot de passe." };
}

export async function revokeOwnSessionsAction(currentPassword: string): Promise<AuthActionResult> {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) return { ok: false, message: "Votre session a expiré." };
  const user = await prisma.user.findUnique({ where: { id: viewer.id }, select: { passwordHash: true } });
  if (!user || !await bcrypt.compare(currentPassword, user.passwordHash)) {
    return { ok: false, message: "Le mot de passe actuel est incorrect.", fieldErrors: { currentPassword: "Vérifiez votre mot de passe." } };
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: viewer.id }, data: { sessionVersion: { increment: 1 } } }),
    prisma.auditLog.create({ data: { actorId: viewer.id, action: "REVOKE_OTHER_SESSIONS", entityType: "User", entityId: viewer.id } }),
  ]);
  return { ok: true, message: "Les autres sessions ont été révoquées." };
}

async function issueAdminEmail(userId: string, type: "INVITATION" | "PASSWORD_RESET"): Promise<AuthActionResult> {
  const viewer = await getViewerForRole("ADMIN");
  if (!viewer) return { ok: false, message: "Accès administrateur requis." };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, status: true, activatedAt: true },
  });
  if (!user || user.status !== "ACTIVE") return { ok: false, message: "Ce compte est introuvable ou inactif." };
  if (type === "INVITATION" && user.activatedAt) return { ok: false, message: "Ce compte est déjà activé." };
  const issued = await prisma.$transaction(async (tx) => {
    const token = await issueAuthToken(user.id, type, tx);
    await tx.auditLog.create({
      data: { actorId: viewer.id, action: type === "INVITATION" ? "RESEND_INVITATION" : "SEND_PASSWORD_RESET", entityType: "User", entityId: user.id },
    });
    return token;
  }, SERIALIZABLE_TRANSACTION_OPTIONS);
  const email = await sendAuthEmail(user, type, issued.token, `${type.toLocaleLowerCase()}:${issued.id}`).catch(() => ({ sent: false, simulated: false, message: "Échec de l’envoi." }));
  return email.sent
    ? { ok: true, message: email.simulated ? "Envoi simulé en environnement local." : "E-mail envoyé." }
    : { ok: false, message: "Le jeton a été créé mais l’e-mail n’a pas pu être envoyé. Vous pouvez renvoyer l’opération." };
}

export async function resendInvitationAction(userId: string) {
  return await issueAdminEmail(userId, "INVITATION");
}

export async function sendPasswordResetAction(userId: string) {
  return await issueAdminEmail(userId, "PASSWORD_RESET");
}

export async function revokeUserSessionsAction(userId: string): Promise<AuthActionResult> {
  const viewer = await getViewerForRole("ADMIN");
  if (!viewer) return { ok: false, message: "Accès administrateur requis." };
  if (viewer.id === userId) return { ok: false, message: "Utilisez la sécurité de votre compte pour révoquer vos propres sessions." };
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
    if (updated.count) await tx.auditLog.create({ data: { actorId: viewer.id, action: "REVOKE_USER_SESSIONS", entityType: "User", entityId: userId } });
    return updated.count;
  });
  return result ? { ok: true, message: "Toutes les sessions de ce compte ont été révoquées." } : { ok: false, message: "Utilisateur introuvable." };
}
