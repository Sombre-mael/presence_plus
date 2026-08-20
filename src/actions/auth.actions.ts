"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedViewer, getViewerForRole } from "@/lib/authenticated-viewer";
import {
  clearTokenVerificationThrottle,
  consumeRecoveryAttempt,
  isAuthThrottled,
  registerAuthFailure,
} from "@/lib/auth-throttle.server";
import { currentClientIp } from "@/lib/auth-request.server";
import { inspectAuthCode, inspectAuthToken, issueAuthToken } from "@/lib/auth-token.server";
import { hashOpaqueToken, normalizeIdentifier } from "@/lib/auth-crypto.server";
import { authActionPath, deliverAuthEmail } from "@/lib/auth-email.server";
import { evaluatePassword } from "@/lib/password-policy";
import { listActiveAuthSessions, revokeAuthSessions } from "@/lib/auth-session.server";
import { SERIALIZABLE_TRANSACTION_OPTIONS } from "@/lib/transaction-options";
import { withSerializableRetry } from "@/lib/database-retry";
import type {
  AuthAccessCredential,
  AuthActionResult as AuthResult,
  AuthCodePreview,
  AuthPasswordSuccess,
  AuthSessionSummary,
} from "@/types/auth";

export type AuthActionResult<T = undefined> = AuthResult<T>;

const GENERIC_RECOVERY_MESSAGE = "Si un moyen de récupération est disponible pour ce compte, les instructions ont été préparées. Si rien ne vous parvient, contactez l’administration.";

type AuthValidationFailure = {
  ok: false;
  message: string;
  fieldErrors: Record<string, string>;
};

function passwordValidation(password: string, confirmation: string, identity: string[]): AuthValidationFailure | null {
  if (password !== confirmation) {
    return { ok: false, message: "Les mots de passe ne correspondent pas.", fieldErrors: { confirmation: "Saisissez le même mot de passe." } };
  }
  const policy = evaluatePassword(password, identity);
  if (!policy.valid) {
    return { ok: false, message: "Le mot de passe ne respecte pas la politique de sécurité.", fieldErrors: { password: policy.errors.join(" ") } };
  }
  return null;
}

function accessCredentialValue(
  issued: { manualCode: string; expiresAt: Date; token: string },
  deliveryStatus: AuthAccessCredential["deliveryStatus"],
  user: { email: string | null; matricule: string | null },
  kind: AuthAccessCredential["kind"],
): AuthAccessCredential {
  return {
    kind,
    identifier: user.email ?? user.matricule ?? "",
    actionPath: authActionPath(kind, issued.token),
    manualCode: issued.manualCode,
    expiresAt: issued.expiresAt.toISOString(),
    deliveryStatus,
  };
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
  if (!user?.email) return { ok: true, message: GENERIC_RECOVERY_MESSAGE };

  const issued = await withSerializableRetry(() => prisma.$transaction(async (tx) => {
    const token = await issueAuthToken(user.id, "PASSWORD_RESET", tx);
    await tx.auditLog.create({
      data: { actorId: null, action: "REQUEST_PASSWORD_RESET", entityType: "User", entityId: user.id },
    });
    return token;
  }, SERIALIZABLE_TRANSACTION_OPTIONS));
  await deliverAuthEmail(issued.id, user, "PASSWORD_RESET", issued.token, null).catch(() => undefined);
  return { ok: true, message: GENERIC_RECOVERY_MESSAGE };
}

async function consumeCredentialAndSetPassword(
  credential: { token?: string; identifier?: string; manualCode?: string },
  type: "INVITATION" | "PASSWORD_RESET",
  password: string,
  confirmation: string,
): Promise<AuthActionResult<AuthPasswordSuccess>> {
  const throttleKey = credential.token
    ? `token:${hashOpaqueToken(credential.token)}`
    : `code:${normalizeIdentifier(credential.identifier ?? "")}`;
  const ip = await currentClientIp();
  if (await isAuthThrottled("TOKEN_VERIFY", throttleKey, ip)) {
    return { ok: false, message: "Trop de tentatives. Réessayez dans quinze minutes." };
  }
  const inspected = credential.token
    ? await inspectAuthToken(credential.token, type)
    : await inspectAuthCode(credential.identifier ?? "", credential.manualCode ?? "", type);
  if (!inspected || inspected.user.status !== "ACTIVE") {
    await registerAuthFailure("TOKEN_VERIFY", throttleKey, ip);
    return {
      ok: false,
      message: "Ce lien ou ce code est invalide, expiré ou déjà utilisé.",
      ...(!credential.token ? {
        fieldErrors: {
          identifier: "Vérifiez l’e-mail ou le matricule remis par l’administration.",
          manualCode: "Vérifiez le code d’activation à usage unique.",
        },
      } : {}),
    };
  }
  if (type === "PASSWORD_RESET" && await bcrypt.compare(password, inspected.user.passwordHash)) {
    return { ok: false, message: "Choisissez un mot de passe différent.", fieldErrors: { password: "Le nouveau mot de passe doit être différent de l’actuel." } };
  }
  const validation = passwordValidation(password, confirmation, [inspected.user.name, inspected.user.email ?? "", inspected.user.matricule ?? ""]);
  if (validation) return validation;
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  try {
    await withSerializableRetry(() => prisma.$transaction(async (tx) => {
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
      await tx.authToken.updateMany({ where: { userId: inspected.user.id, usedAt: null }, data: { usedAt: now } });
      await revokeAuthSessions(tx, inspected.user.id, type === "INVITATION" ? "ACCOUNT_ACTIVATED" : "PASSWORD_RESET", undefined, now);
      await tx.auditLog.create({
        data: {
          actorId: inspected.user.id,
          action: type === "INVITATION" ? "ACTIVATE_ACCOUNT" : "RESET_PASSWORD",
          entityType: "User",
          entityId: inspected.user.id,
          metadata: { method: credential.token ? "LINK" : "MANUAL_CODE" },
        },
      });
    }, SERIALIZABLE_TRANSACTION_OPTIONS));
  } catch {
    return { ok: false, message: "Ce lien ou ce code est invalide, expiré ou déjà utilisé." };
  }
  await clearTokenVerificationThrottle(throttleKey, ip);
  return {
    ok: true,
    message: type === "INVITATION" ? "Votre compte est activé." : "Votre mot de passe a été modifié. Vous pouvez vous connecter.",
    value: { identifier: inspected.user.email ?? inspected.user.matricule ?? "" },
  };
}

export async function previewAuthCodeAction(
  identifierValue: string,
  manualCode: string,
  type: "INVITATION" | "PASSWORD_RESET",
): Promise<AuthActionResult<AuthCodePreview>> {
  if (type !== "INVITATION" && type !== "PASSWORD_RESET") {
    return { ok: false, message: "Ce code ne peut pas être vérifié pour le moment." };
  }
  const identifier = normalizeIdentifier(identifierValue);
  const throttleKey = `code:${identifier}`;
  const ip = await currentClientIp();
  if (!identifier || !manualCode || await isAuthThrottled("TOKEN_VERIFY", throttleKey, ip)) {
    return { ok: false, message: "Ce code ne peut pas être vérifié pour le moment." };
  }
  const inspected = await inspectAuthCode(identifier, manualCode, type);
  if (!inspected || inspected.user.status !== "ACTIVE") {
    await registerAuthFailure("TOKEN_VERIFY", throttleKey, ip);
    return {
      ok: false,
      message: "Ce code est invalide, expiré ou déjà utilisé.",
      fieldErrors: {
        identifier: "Vérifiez l’e-mail ou le matricule remis par l’administration.",
        manualCode: "Vérifiez le code à usage unique.",
      },
    };
  }
  return {
    ok: true,
    message: "Code vérifié.",
    value: {
      identifier: inspected.user.email ?? inspected.user.matricule ?? identifierValue.trim(),
      displayName: inspected.user.name,
      expiresAt: inspected.expiresAt.toISOString(),
    },
  };
}

export async function activateAccountAction(token: string, password: string, confirmation: string, identifier?: string, manualCode?: string) {
  return consumeCredentialAndSetPassword({ token: token || undefined, identifier, manualCode }, "INVITATION", password, confirmation);
}

export async function resetPasswordAction(token: string, password: string, confirmation: string, identifier?: string, manualCode?: string) {
  return consumeCredentialAndSetPassword({ token: token || undefined, identifier, manualCode }, "PASSWORD_RESET", password, confirmation);
}

export async function changeOwnPasswordAction(currentPassword: string, password: string, confirmation: string): Promise<AuthActionResult> {
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
  const validation = passwordValidation(password, confirmation, [user.name, user.email ?? "", user.matricule ?? ""]);
  if (validation) return validation;
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: viewer.id },
      data: { passwordHash, mustChangePassword: false, passwordChangedAt: now, sessionVersion: { increment: 1 } },
    });
    await revokeAuthSessions(tx, viewer.id, "PASSWORD_CHANGED", undefined, now);
    await tx.authToken.updateMany({ where: { userId: viewer.id, usedAt: null }, data: { usedAt: now } });
    await tx.auditLog.create({ data: { actorId: viewer.id, action: "CHANGE_PASSWORD", entityType: "User", entityId: viewer.id } });
  });
  return { ok: true, message: "Mot de passe modifié. Reconnectez-vous avec votre nouveau mot de passe." };
}

async function verifyCurrentPassword(userId: string, currentPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  return Boolean(user && await bcrypt.compare(currentPassword, user.passwordHash));
}

export async function listOwnAuthSessionsAction(): Promise<AuthActionResult<AuthSessionSummary[]>> {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) return { ok: false, message: "Votre session a expiré." };
  return { ok: true, message: "Sessions chargées.", value: await listActiveAuthSessions(viewer.id, viewer.authSessionId) };
}

export async function revokeOwnSessionAction(sessionId: string, currentPassword: string): Promise<AuthActionResult> {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) return { ok: false, message: "Votre session a expiré." };
  if (sessionId === viewer.authSessionId) return { ok: false, message: "Utilisez la déconnexion pour fermer la session actuelle." };
  if (!await verifyCurrentPassword(viewer.id, currentPassword)) {
    return { ok: false, message: "Le mot de passe actuel est incorrect.", fieldErrors: { currentPassword: "Vérifiez votre mot de passe." } };
  }
  const now = new Date();
  const revoked = await prisma.$transaction(async (tx) => {
    const result = await tx.authSession.updateMany({
      where: { id: sessionId, userId: viewer.id, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now, revokedReason: "USER_REVOKED" },
    });
    if (result.count) await tx.auditLog.create({ data: { actorId: viewer.id, action: "REVOKE_SESSION", entityType: "AuthSession", entityId: sessionId } });
    return result.count;
  });
  return revoked ? { ok: true, message: "La session a été révoquée." } : { ok: false, message: "Cette session n’est plus active." };
}

export async function revokeOwnSessionsAction(currentPassword: string): Promise<AuthActionResult> {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) return { ok: false, message: "Votre session a expiré." };
  if (!await verifyCurrentPassword(viewer.id, currentPassword)) {
    return { ok: false, message: "Le mot de passe actuel est incorrect.", fieldErrors: { currentPassword: "Vérifiez votre mot de passe." } };
  }
  const revoked = await prisma.$transaction(async (tx) => {
    const result = await revokeAuthSessions(tx, viewer.id, "USER_REVOKED_OTHERS", viewer.authSessionId);
    await tx.auditLog.create({ data: { actorId: viewer.id, action: "REVOKE_OTHER_SESSIONS", entityType: "User", entityId: viewer.id, metadata: { count: result.count } } });
    return result.count;
  });
  return { ok: true, message: revoked ? `${revoked} autre session révoquée.` : "Aucune autre session active." };
}

async function issueAdminCredential(userId: string, type: "INVITATION" | "PASSWORD_RESET"): Promise<AuthActionResult<AuthAccessCredential>> {
  const viewer = await getViewerForRole("ADMIN");
  if (!viewer) return { ok: false, message: "Accès administrateur requis." };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, matricule: true, status: true, activatedAt: true } });
  if (!user || user.status !== "ACTIVE") return { ok: false, message: "Ce compte est introuvable ou inactif." };
  if (type === "INVITATION" && user.activatedAt) return { ok: false, message: "Ce compte est déjà activé." };
  const issued = await withSerializableRetry(() => prisma.$transaction(async (tx) => {
    const token = await issueAuthToken(user.id, type, tx);
    await tx.auditLog.create({
      data: { actorId: viewer.id, action: type === "INVITATION" ? "RESEND_INVITATION" : "SEND_PASSWORD_RESET", entityType: "User", entityId: user.id },
    });
    return token;
  }, SERIALIZABLE_TRANSACTION_OPTIONS));
  const delivery = await deliverAuthEmail(issued.id, user, type, issued.token, viewer.id);
  const message = delivery.status === "NOT_APPLICABLE"
    ? "Lien et code générés. Remettez-les directement à l’utilisateur."
    : delivery.status === "FAILED"
      ? "Accès généré, mais l’e-mail n’a pas été accepté."
      : delivery.status === "SIMULATED"
        ? "Lien et code générés pour remise directe à l’utilisateur."
        : "Accès généré et e-mail accepté par le service d’envoi.";
  return { ok: true, message, value: accessCredentialValue(issued, delivery.status, user, type) };
}

export async function resendInvitationAction(userId: string) {
  return issueAdminCredential(userId, "INVITATION");
}

export async function sendPasswordResetAction(userId: string) {
  return issueAdminCredential(userId, "PASSWORD_RESET");
}

export async function revokeUserSessionsAction(userId: string): Promise<AuthActionResult> {
  const viewer = await getViewerForRole("ADMIN");
  if (!viewer) return { ok: false, message: "Accès administrateur requis." };
  if (viewer.id === userId) return { ok: false, message: "Utilisez la sécurité de votre compte pour révoquer vos propres sessions." };
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
    if (!updated.count) return 0;
    await revokeAuthSessions(tx, userId, "ADMIN_REVOKED", undefined, now);
    await tx.auditLog.create({ data: { actorId: viewer.id, action: "REVOKE_USER_SESSIONS", entityType: "User", entityId: userId } });
    return updated.count;
  });
  return result ? { ok: true, message: "Toutes les sessions de ce compte ont été révoquées." } : { ok: false, message: "Utilisateur introuvable." };
}
