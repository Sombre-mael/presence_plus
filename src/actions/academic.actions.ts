"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  fromAcademicDateTime,
  getAcademicPatch,
  getAcademicSnapshot,
  toAcademicDate,
  toAcademicTime,
  type AcademicCollection,
  type AcademicPatch,
} from "@/lib/academic-repository";
import { getAuthenticatedViewer, type AuthenticatedViewer } from "@/lib/authenticated-viewer";
import { issueAuthToken } from "@/lib/auth-token.server";
import { authActionPath, deliverAuthEmail } from "@/lib/auth-email.server";
import { unusablePassword } from "@/lib/auth-crypto.server";
import { revokeAuthSessions } from "@/lib/auth-session.server";
import {
  createPreviewReceipt,
  createServerQrToken,
  matchesServerQrToken,
  verifyPreviewReceipt,
} from "@/lib/qr-token.server";
import {
  getCourseDeleteBlockers,
  getPromotionDeleteBlockers,
  getUserDeleteBlockers,
  validateCourse,
  validatePromotion,
  validateUser,
} from "@/lib/admin-domain";
import {
  validateAttendanceInput,
  validateTeacherSession,
} from "@/lib/academic-domain";
import { validateCorrectionRequest } from "@/lib/student-domain";
import type {
  AdminAuditLog,
  AdminCourseInput,
  AdminPromotionInput,
  AdminUserInput,
  AttendanceInput,
  MutationResult,
  TeacherSessionInput,
  UserAccessMutationValue,
} from "@/types/admin";
import type {
  CheckInPreview,
  CheckInValidationResult,
  CorrectionRequestInput,
  CorrectionResolutionInput,
  StudentCheckInInput,
} from "@/types/student";
import type { AttendanceSource, AttendanceStatus } from "@/types";
import type { Prisma } from "@/generated/prisma/client";
import { addAcademicDays } from "@/lib/academic-calendar";
import { prismaMutationFailure } from "@/lib/prisma-errors";
import { isWithinSessionStartWindow } from "@/lib/session-lifecycle";
import { SERIALIZABLE_TRANSACTION_OPTIONS } from "@/lib/transaction-options";
import type { AuthAccessCredential } from "@/types/auth";
import { createUserNotifications, deliverNotificationPush } from "@/lib/notifications.server";

export type AcademicActionResult<T = undefined> = MutationResult & {
  patch?: AcademicPatch;
  value?: T;
};

type CheckInActionResult = CheckInValidationResult & { patch?: AcademicPatch };

async function success<T = undefined>(viewer: AuthenticatedViewer, message: string, keys: AcademicCollection[], value?: T): Promise<AcademicActionResult<T>> {
  try {
    return { ok: true, message, patch: await getAcademicPatch(viewer, keys), value };
  } catch {
    // The mutation is already committed. A failed refresh must not invite a duplicate retry.
    return { ok: true, message: `${message} Actualisez la page si les données ne s’affichent pas immédiatement.`, value };
  }
}

function failure<T = undefined>(result: MutationResult): AcademicActionResult<T> {
  return result;
}

async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
  database: Pick<Prisma.TransactionClient, "auditLog"> = prisma,
) {
  await database.auditLog.create({
    data: { actorId, action, entityType, entityId, metadata: metadata as Prisma.InputJsonValue | undefined },
  });
}

const prismaFailure = prismaMutationFailure;

async function userStatusBlocker(
  database: Prisma.TransactionClient,
  id: string,
  status: "ACTIVE" | "INACTIVE",
  viewerId: string,
) {
  if (status === "ACTIVE") return null;
  if (id === viewerId) return "Vous ne pouvez pas désactiver le profil administrateur utilisé.";
  const user = await database.user.findUnique({ where: { id }, select: { role: true, status: true } });
  if (!user) return "Utilisateur introuvable.";
  if (user.role === "ADMIN" && user.status === "ACTIVE") {
    const otherAdmins = await database.user.count({ where: { id: { not: id }, role: "ADMIN", status: "ACTIVE" } });
    if (!otherAdmins) return "Le dernier administrateur actif ne peut pas être désactivé.";
  }
  if (user.role === "TEACHER") {
    const blocking = await database.session.count({ where: { teacherId: id, status: { in: ["SCHEDULED", "ACTIVE"] } } });
    if (blocking) return `${blocking} session(s) planifiée(s) ou active(s) doivent d’abord être traitées.`;
  }
  if (user.role === "STUDENT") {
    const blocking = await database.sessionEnrollment.count({ where: { studentId: id, session: { status: "ACTIVE" } } });
    if (blocking) return "Cet étudiant appartient à l’effectif d’une session active.";
  }
  return null;
}

async function lastAdminRoleBlocker(database: Prisma.TransactionClient, id: string, nextRole: AdminUserInput["role"]) {
  const user = await database.user.findUnique({ where: { id }, select: { role: true, status: true } });
  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE" || nextRole === "ADMIN") return null;
  const otherAdmins = await database.user.count({ where: { id: { not: id }, role: "ADMIN", status: "ACTIVE" } });
  return otherAdmins ? null : "Le rôle du dernier administrateur actif ne peut pas être modifié.";
}

async function viewerFor(role?: AuthenticatedViewer["role"]) {
  const viewer = await getAuthenticatedViewer();
  return viewer && !viewer.mustChangePassword && (!role || viewer.role === role) ? viewer : null;
}

function forbidden(): AcademicActionResult {
  return { ok: false, message: "Votre session ne permet pas cette action." };
}

async function createAndSendInvitation(userId: string, actorId: string) {
  const issued = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { name: true, email: true, matricule: true } });
    if (!user) throw new Error("Utilisateur introuvable.");
    const token = await issueAuthToken(userId, "INVITATION", tx);
    await audit(actorId, "SEND_INVITATION", "User", userId, undefined, tx);
    return { user, token };
  }, SERIALIZABLE_TRANSACTION_OPTIONS);
  const delivery = await deliverAuthEmail(issued.token.id, issued.user, "INVITATION", issued.token.token, actorId);
  return {
    kind: "INVITATION",
    identifier: issued.user.email ?? issued.user.matricule ?? "",
    actionPath: authActionPath("INVITATION", issued.token.token),
    manualCode: issued.token.manualCode,
    expiresAt: issued.token.expiresAt.toISOString(),
    deliveryStatus: delivery.status,
  } satisfies AuthAccessCredential;
}

export async function loadAcademicDataAction() {
  const viewer = await viewerFor();
  if (!viewer) return { viewerId: null, role: null, state: null, syncedAt: new Date().toISOString() };
  return {
    viewerId: viewer.id,
    role: viewer.role,
    state: await getAcademicSnapshot(viewer),
    syncedAt: new Date().toISOString(),
  };
}

export async function loadLiveAcademicDataAction() {
  const viewer = await viewerFor();
  if (!viewer) return { viewerId: null, role: null, patch: null, syncedAt: new Date().toISOString() };
  return {
    viewerId: viewer.id,
    role: viewer.role,
    patch: await getAcademicPatch(viewer, ["sessions", "attendances", "correctionRequests"]),
    syncedAt: new Date().toISOString(),
  };
}

export interface AdminAuditQuery {
  query?: string;
  actorId?: string;
  action?: string;
  entityType?: string;
  date?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminAuditPage {
  items: AdminAuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

export async function loadAdminAuditLogsAction(input: AdminAuditQuery): Promise<AdminAuditPage> {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) throw new Error("Accès administrateur requis.");
  const page = Math.max(1, Math.trunc(input.page ?? 1));
  const pageSize = Math.min(50, Math.max(10, Math.trunc(input.pageSize ?? 25)));
  const query = input.query?.trim();
  const where: Prisma.AuditLogWhereInput = {
    ...(input.actorId === "SYSTEM"
      ? { actorId: null }
      : input.actorId
        ? { actorId: input.actorId }
        : {}),
    ...(input.action ? { action: input.action } : {}),
    ...(input.entityType ? { entityType: input.entityType } : {}),
    ...(input.date ? {
      createdAt: {
        gte: fromAcademicDateTime(input.date, "00:00"),
        lt: fromAcademicDateTime(addAcademicDays(input.date, 1), "00:00"),
      },
    } : {}),
    ...(query ? {
      OR: [
        { action: { contains: query, mode: "insensitive" } },
        { entityType: { contains: query, mode: "insensitive" } },
        { entityId: { contains: query, mode: "insensitive" } },
        { actor: { name: { contains: query, mode: "insensitive" } } },
      ],
    } : {}),
  };
  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { name: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return {
    page,
    pageSize,
    total,
    items: logs.map((log) => ({
      id: log.id,
      actorId: log.actorId,
      actorName: log.actor?.name ?? "Système",
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
        ? log.metadata as Record<string, unknown>
        : undefined,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}

export async function createUserAction(input: AdminUserInput): Promise<AcademicActionResult<UserAccessMutationValue>> {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  const state = await getAcademicSnapshot(viewer);
  const validation = validateUser(state, input);
  if (!validation.ok) return failure(validation);
  const id = randomUUID();
  const email = input.email?.trim().toLowerCase() || null;
  const matricule = input.role === "STUDENT" ? input.matricule?.trim().toUpperCase() || null : null;
  const passwordHash = await bcrypt.hash(unusablePassword(), 12);
  let invitation: Awaited<ReturnType<typeof issueAuthToken>> | null;
  try {
    invitation = await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id,
          name: input.name.trim(),
          email,
          role: input.role,
          status: input.status,
          activatedAt: null,
          mustChangePassword: true,
          matricule,
          passwordHash,
          ...(input.role === "STUDENT" && input.promotionId
            ? { promotion: { connect: { id: input.promotionId } } }
            : {}),
        },
      });
      const token = input.status === "ACTIVE" ? await issueAuthToken(id, "INVITATION", tx) : null;
      await audit(viewer.id, "CREATE_USER", "User", id, undefined, tx);
      return token;
    }, SERIALIZABLE_TRANSACTION_OPTIONS);
  } catch (error) {
    return prismaFailure(error, "L’utilisateur n’a pas pu être créé.");
  }
  if (!invitation) return success(viewer, `${validation.message} Le compte inactif n’a pas reçu d’invitation.`, ["users", "auditLogs"], { id });
  const delivery = await deliverAuthEmail(invitation.id, { email, name: input.name.trim() }, "INVITATION", invitation.token, viewer.id);
  const message = delivery.status === "NOT_APPLICABLE"
    ? `${validation.message} Un lien et un code d’activation ont été générés.`
    : delivery.status === "FAILED"
      ? `${validation.message} L’accès est disponible, mais l’e-mail n’a pas été accepté.`
      : `${validation.message} ${delivery.status === "SIMULATED" ? "Le lien et le code sont prêts à être remis directement à l’utilisateur." : "L’envoi a été accepté par le service d’e-mail."}`;
  return success(viewer, message, ["users", "auditLogs"], {
    id,
    kind: "INVITATION",
    identifier: email ?? matricule ?? "",
    actionPath: authActionPath("INVITATION", invitation.token),
    manualCode: invitation.manualCode,
    expiresAt: invitation.expiresAt.toISOString(),
    deliveryStatus: delivery.status,
  });
}

export async function updateUserAction(id: string, input: AdminUserInput): Promise<AcademicActionResult<UserAccessMutationValue>> {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  const state = await getAcademicSnapshot(viewer);
  const validation = validateUser(state, input, id);
  if (!validation.ok) return failure(validation);
  const current = state.users.find((user) => user.id === id);
  const email = input.email?.trim().toLowerCase() || null;
  if (!current) return failure({ ok: false, message: "Utilisateur introuvable." });
  if (current.role !== input.role) {
    const hasDependencies = state.courses.some((course) => course.teacherId === id) ||
      state.sessions.some((session) => session.teacherId === id) ||
      state.sessions.some((session) => session.enrolledStudentIds?.includes(id)) ||
      state.attendances.some((attendance) => attendance.studentId === id) ||
      state.correctionRequests.some((request) => request.studentId === id || request.teacherId === id);
    if (hasDependencies) return failure({ ok: false, message: "Le rôle ne peut pas changer tant que ce compte possède un historique métier.", fieldErrors: { role: "Désactivez le compte ou conservez son rôle." } });
  }
  try {
    await prisma.$transaction(async (tx) => {
      const persisted = await tx.user.findUnique({ where: { id }, select: { role: true, status: true, email: true } });
      if (!persisted) throw Object.assign(new Error("Utilisateur introuvable."), { code: "BUSINESS_RULE" });
      if (persisted.role !== input.role) {
        const adminBlocker = await lastAdminRoleBlocker(tx, id, input.role);
        if (adminBlocker) throw Object.assign(new Error(adminBlocker), { code: "BUSINESS_ROLE" });
        const dependencies = await Promise.all([
          tx.course.count({ where: { teacherId: id } }),
          tx.session.count({ where: { teacherId: id } }),
          tx.sessionEnrollment.count({ where: { studentId: id } }),
          tx.attendance.count({ where: { studentId: id } }),
          tx.attendanceCorrectionRequest.count({ where: { OR: [{ studentId: id }, { teacherId: id }] } }),
        ]);
        if (dependencies.some(Boolean)) {
          throw Object.assign(new Error("Le rôle ne peut pas changer tant que ce compte possède un historique métier."), { code: "BUSINESS_ROLE" });
        }
      }
      if (persisted.status !== input.status) {
        const blocker = await userStatusBlocker(tx, id, input.status, viewer.id);
        if (blocker) throw Object.assign(new Error(blocker), { code: "BUSINESS_RULE" });
      }
      const securityChanged = persisted.role !== input.role || persisted.status !== input.status || persisted.email?.toLocaleLowerCase("fr") !== email?.toLocaleLowerCase("fr");
      await tx.user.update({
        where: { id },
        data: {
          name: input.name.trim(),
          email,
          role: input.role,
          status: input.status,
          ...(securityChanged ? { sessionVersion: { increment: 1 } } : {}),
          matricule: input.role === "STUDENT" ? input.matricule?.trim().toUpperCase() : null,
          promotion: input.role === "STUDENT" && input.promotionId
            ? { connect: { id: input.promotionId } }
            : { disconnect: true },
        },
      });
      if (securityChanged) {
        const now = new Date();
        await tx.authToken.updateMany({ where: { userId: id, usedAt: null }, data: { usedAt: now } });
        await revokeAuthSessions(tx, id, "ACCOUNT_SECURITY_CHANGED", undefined, now);
      }
      await audit(viewer.id, "UPDATE_USER", "User", id, undefined, tx);
    }, SERIALIZABLE_TRANSACTION_OPTIONS);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "BUSINESS_ROLE") {
      return failure({ ok: false, message: error.message, fieldErrors: { role: "Conservez le rôle actuel ou utilisez un autre compte." } });
    }
    if (error instanceof Error && "code" in error && error.code === "BUSINESS_RULE") {
      return failure({ ok: false, message: error.message, fieldErrors: { status: error.message } });
    }
    return prismaFailure(error, "L’utilisateur n’a pas pu être modifié.");
  }
  if (current.status === "INACTIVE" && input.status === "ACTIVE" && !current.activatedAt) {
    const credential = await createAndSendInvitation(id, viewer.id);
    return success(viewer, `${validation.message} Un nouveau lien d’activation et son code ont été générés.`, ["users", "auditLogs"], credential);
  }
  return success(viewer, validation.message, ["users", "auditLogs"]);
}

export async function deleteUserAction(id: string) {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  const state = await getAcademicSnapshot(viewer);
  const blockers = getUserDeleteBlockers(state, id, viewer.id);
  if (blockers.length) return failure({ ok: false, message: blockers.join(" ") });
  try {
    await prisma.$transaction(async (tx) => {
      const blocker = await lastAdminRoleBlocker(tx, id, "STUDENT");
      if (blocker) throw Object.assign(new Error("Le dernier administrateur actif ne peut pas être supprimé."), { code: "BUSINESS_RULE" });
      await tx.user.delete({ where: { id } });
      await audit(viewer.id, "DELETE_USER", "User", id, undefined, tx);
    }, SERIALIZABLE_TRANSACTION_OPTIONS);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "BUSINESS_RULE") return failure({ ok: false, message: error.message });
    return prismaFailure(error, "L’utilisateur n’a pas pu être supprimé.");
  }
  return success(viewer, "Utilisateur supprimé.", ["users", "auditLogs"]);
}

export async function setUserStatusAction(id: string, status: "ACTIVE" | "INACTIVE"): Promise<AcademicActionResult<UserAccessMutationValue>> {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  const current = await prisma.user.findUnique({ where: { id }, select: { activatedAt: true } });
  try {
    await prisma.$transaction(async (tx) => {
      const blocker = await userStatusBlocker(tx, id, status, viewer.id);
      if (blocker) throw Object.assign(new Error(blocker), { code: "BUSINESS_RULE" });
      const now = new Date();
      await tx.user.update({ where: { id }, data: { status, sessionVersion: { increment: 1 } } });
      await revokeAuthSessions(tx, id, "ACCOUNT_STATUS_CHANGED", undefined, now);
      if (status === "INACTIVE") {
        await tx.authToken.updateMany({ where: { userId: id, usedAt: null }, data: { usedAt: now } });
      }
      await audit(viewer.id, status === "ACTIVE" ? "ACTIVATE_USER" : "DEACTIVATE_USER", "User", id, undefined, tx);
    }, SERIALIZABLE_TRANSACTION_OPTIONS);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "BUSINESS_RULE") return failure({ ok: false, message: error.message });
    return prismaFailure(error, "Le statut du compte n’a pas pu être modifié.");
  }
  if (status === "ACTIVE" && !current?.activatedAt) {
    const credential = await createAndSendInvitation(id, viewer.id);
    return success(viewer, "Compte activé et nouvel accès d’activation généré.", ["users", "auditLogs"], credential);
  }
  return success(viewer, status === "ACTIVE" ? "Compte activé." : "Compte désactivé.", ["users", "auditLogs"]);
}

export async function createPromotionAction(input: AdminPromotionInput) {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  const state = await getAcademicSnapshot(viewer);
  const validation = validatePromotion(state, input);
  if (!validation.ok) return failure(validation);
  let promotionId = "";
  try {
    await prisma.$transaction(async (tx) => {
      const promotion = await tx.promotion.create({ data: { ...input, description: input.description?.trim() || null, name: input.name.trim(), department: input.department.trim() } });
      promotionId = promotion.id;
      await audit(viewer.id, "CREATE_PROMOTION", "Promotion", promotion.id, undefined, tx);
    }, SERIALIZABLE_TRANSACTION_OPTIONS);
  } catch (error) {
    return prismaFailure(error, "La promotion n’a pas pu être créée.");
  }
  return success(viewer, validation.message, ["promotions", "auditLogs"], { id: promotionId });
}

export async function updatePromotionAction(id: string, input: AdminPromotionInput) {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  const state = await getAcademicSnapshot(viewer);
  const validation = validatePromotion(state, input, id);
  if (!validation.ok) return failure(validation);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.promotion.update({ where: { id }, data: { ...input, description: input.description?.trim() || null, name: input.name.trim(), department: input.department.trim() } });
      await audit(viewer.id, "UPDATE_PROMOTION", "Promotion", id, undefined, tx);
    }, SERIALIZABLE_TRANSACTION_OPTIONS);
  } catch (error) {
    return prismaFailure(error, "La promotion n’a pas pu être modifiée.");
  }
  return success(viewer, validation.message, ["promotions", "auditLogs"]);
}

export async function deletePromotionAction(id: string) {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  const blockers = getPromotionDeleteBlockers(await getAcademicSnapshot(viewer), id);
  if (blockers.length) return failure({ ok: false, message: blockers.join(" ") });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.promotion.delete({ where: { id } });
      await audit(viewer.id, "DELETE_PROMOTION", "Promotion", id, undefined, tx);
    }, SERIALIZABLE_TRANSACTION_OPTIONS);
  } catch (error) {
    return prismaFailure(error, "La promotion n’a pas pu être supprimée.");
  }
  return success(viewer, "Promotion supprimée.", ["promotions", "auditLogs"]);
}

export async function createCourseAction(input: AdminCourseInput) {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  const state = await getAcademicSnapshot(viewer);
  const validation = validateCourse(state, input);
  if (!validation.ok) return failure(validation);
  let courseId = "";
  try {
    await prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          code: input.code.trim().toUpperCase(),
          name: input.name.trim(),
          weeklyHours: input.weeklyHours,
          description: input.description?.trim() || null,
          active: input.active ?? true,
          teacher: { connect: { id: input.teacherId } },
          promotion: { connect: { id: input.promotionId } },
        },
      });
      courseId = course.id;
      await audit(viewer.id, "CREATE_COURSE", "Course", course.id, undefined, tx);
    }, SERIALIZABLE_TRANSACTION_OPTIONS);
  } catch (error) {
    return prismaFailure(error, "Le cours n’a pas pu être créé.");
  }
  return success(viewer, validation.message, ["courses", "auditLogs"], { id: courseId });
}

export async function updateCourseAction(id: string, input: AdminCourseInput) {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  const state = await getAcademicSnapshot(viewer);
  const validation = validateCourse(state, input, id);
  if (!validation.ok) return failure(validation);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.course.update({
        where: { id },
        data: {
          code: input.code.trim().toUpperCase(),
          name: input.name.trim(),
          weeklyHours: input.weeklyHours,
          description: input.description?.trim() || null,
          active: input.active ?? true,
          teacher: { connect: { id: input.teacherId } },
          promotion: { connect: { id: input.promotionId } },
        },
      });
      await audit(viewer.id, "UPDATE_COURSE", "Course", id, undefined, tx);
    }, SERIALIZABLE_TRANSACTION_OPTIONS);
  } catch (error) {
    return prismaFailure(error, "Le cours n’a pas pu être modifié.");
  }
  return success(viewer, validation.message, ["courses", "auditLogs"]);
}

export async function deleteCourseAction(id: string) {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  const blockers = getCourseDeleteBlockers(await getAcademicSnapshot(viewer), id);
  if (blockers.length) return failure({ ok: false, message: blockers.join(" ") });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.course.delete({ where: { id } });
      await audit(viewer.id, "DELETE_COURSE", "Course", id, undefined, tx);
    }, SERIALIZABLE_TRANSACTION_OPTIONS);
  } catch (error) {
    return prismaFailure(error, "Le cours n’a pas pu être supprimé.");
  }
  return success(viewer, "Cours supprimé.", ["courses", "auditLogs"]);
}

export async function setCourseActiveAction(id: string, active: boolean) {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  try {
    await prisma.$transaction(async (tx) => {
      if (!active) {
        const blocking = await tx.session.count({ where: { courseId: id, status: { in: ["SCHEDULED", "ACTIVE"] } } });
        if (blocking) throw Object.assign(new Error(`${blocking} session(s) planifiée(s) ou active(s) empêchent la désactivation.`), { code: "BUSINESS_RULE" });
      }
      const updated = await tx.course.updateMany({ where: { id }, data: { active } });
      if (!updated.count) throw Object.assign(new Error("Cours introuvable."), { code: "BUSINESS_RULE" });
      await audit(viewer.id, active ? "ACTIVATE_COURSE" : "DEACTIVATE_COURSE", "Course", id, undefined, tx);
    }, SERIALIZABLE_TRANSACTION_OPTIONS);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "BUSINESS_RULE") return failure({ ok: false, message: error.message });
    return prismaFailure(error, "L’état du cours n’a pas pu être modifié.");
  }
  return success(viewer, active ? "Cours activé." : "Cours désactivé.", ["courses", "auditLogs"]);
}

export async function createSessionAction(input: TeacherSessionInput) {
  const viewer = await viewerFor("TEACHER");
  if (!viewer) return forbidden();
  const state = await getAcademicSnapshot(viewer);
  const validation = validateTeacherSession(state, input, viewer.id);
  if (!validation.ok) return failure(validation);
  const course = state.courses.find((item) => item.id === input.courseId)!;
  const start = fromAcademicDateTime(input.date, input.startTime);
  const end = fromAcademicDateTime(input.date, input.endTime);
  const outcome = await prisma.$transaction(async (tx) => {
    const available = await tx.course.findFirst({ where: { id: course.id, teacherId: viewer.id, active: true } });
    if (!available) return null;
    const conflict = await tx.session.findFirst({
      where: {
        status: { in: ["SCHEDULED", "ACTIVE"] },
        scheduledStartAt: { lt: end },
        scheduledEndAt: { gt: start },
        OR: [{ teacherId: viewer.id }, { promotionId: course.promotionId }, { room: { equals: input.room.trim(), mode: "insensitive" } }],
      },
      select: { id: true },
    });
    if (conflict) return null;
    const session = await tx.session.create({
      data: {
        name: input.name?.trim() || `${course.name} - séance`,
        description: input.description?.trim() || null,
        scheduledStartAt: start,
        scheduledEndAt: end,
        room: input.room.trim(),
        lateThresholdMinutes: input.lateThresholdMinutes,
        teacher: { connect: { id: viewer.id } },
        promotion: { connect: { id: course.promotionId } },
        courses: { connect: { id: course.id } },
      },
    });
    const students = await tx.user.findMany({
      where: { role: "STUDENT", status: "ACTIVE", promotionId: course.promotionId },
      select: { id: true },
    });
    const notificationIds = await createUserNotifications(tx, students.map((student) => student.id), {
      kind: "SESSION_SCHEDULED",
      title: "Nouvelle séance planifiée",
      body: `${course.code} est prévue le ${toAcademicDate(start)} à ${toAcademicTime(start)} en salle ${input.room.trim()}.`,
      href: "/student/schedule",
      dedupeKey: `session-scheduled:${session.id}`,
      expiresAt: end,
    });
    return { session, notificationIds };
  }, SERIALIZABLE_TRANSACTION_OPTIONS);
  if (!outcome) return failure({ ok: false, message: "Le cours est inactif ou ce créneau vient d'être réservé." });
  await audit(viewer.id, "CREATE_SESSION", "Session", outcome.session.id);
  await deliverNotificationPush(outcome.notificationIds).catch(() => undefined);
  return success(viewer, validation.message, ["sessions"], { id: outcome.session.id });
}

export async function updateSessionAction(id: string, input: TeacherSessionInput) {
  const viewer = await viewerFor("TEACHER");
  if (!viewer) return forbidden();
  const state = await getAcademicSnapshot(viewer);
  const current = state.sessions.find((item) => item.id === id);
  if (!current || current.status !== "SCHEDULED" || current.teacherId !== viewer.id) {
    return failure({ ok: false, message: "Seule une de vos sessions planifiées peut être modifiée." });
  }
  const validation = validateTeacherSession(state, input, viewer.id, id);
  if (!validation.ok) return failure(validation);
  const course = state.courses.find((item) => item.id === input.courseId)!;
  const start = fromAcademicDateTime(input.date, input.startTime);
  const end = fromAcademicDateTime(input.date, input.endTime);
  const outcome = await prisma.$transaction(async (tx) => {
    const conflict = await tx.session.findFirst({
      where: {
        id: { not: id },
        status: { in: ["SCHEDULED", "ACTIVE"] },
        scheduledStartAt: { lt: end },
        scheduledEndAt: { gt: start },
        OR: [{ teacherId: viewer.id }, { promotionId: course.promotionId }, { room: { equals: input.room.trim(), mode: "insensitive" } }],
      },
      select: { id: true },
    });
    if (conflict) return null;
    const result = await tx.session.updateMany({
      where: { id, teacherId: viewer.id, status: "SCHEDULED" },
      data: { name: input.name?.trim() || current.name || current.courseName, description: input.description?.trim() || null, scheduledStartAt: start, scheduledEndAt: end, room: input.room.trim(), lateThresholdMinutes: input.lateThresholdMinutes, courseId: course.id, promotionId: course.promotionId },
    });
    if (result.count !== 1) return null;
    const students = await tx.user.findMany({
      where: { role: "STUDENT", status: "ACTIVE", promotionId: course.promotionId },
      select: { id: true },
    });
    const notificationIds = await createUserNotifications(tx, students.map((student) => student.id), {
      kind: "SESSION_UPDATED",
      title: "Séance modifiée",
      body: `${course.code} est désormais prévue le ${toAcademicDate(start)} à ${toAcademicTime(start)} en salle ${input.room.trim()}.`,
      href: "/student/schedule",
      dedupeKey: `session-updated:${id}`,
      expiresAt: end,
    });
    return { notificationIds };
  }, SERIALIZABLE_TRANSACTION_OPTIONS);
  if (!outcome) return failure({ ok: false, message: "La session a changé ou le créneau vient d'être réservé." });
  await audit(viewer.id, "UPDATE_SESSION", "Session", id);
  await deliverNotificationPush(outcome.notificationIds).catch(() => undefined);
  return success(viewer, validation.message, ["sessions"]);
}

export async function startSessionAction(id: string) {
  const viewer = await viewerFor("TEACHER");
  if (!viewer) return forbidden();
  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id } });
    if (!session || session.teacherId !== viewer.id || session.status !== "SCHEDULED") return { kind: "INVALID" as const, notificationIds: [] };
    const now = new Date();
    if (!isWithinSessionStartWindow(session.scheduledStartAt, session.scheduledEndAt, now)) return { kind: "OUTSIDE_WINDOW" as const, notificationIds: [] };
    const active = await tx.session.count({ where: { teacherId: viewer.id, status: "ACTIVE" } });
    if (active) return { kind: "ACTIVE_EXISTS" as const, notificationIds: [] };
    const students = await tx.user.findMany({
      where: { role: "STUDENT", status: "ACTIVE", promotionId: session.promotionId },
      select: { id: true },
    });
    if (students.length) {
      await tx.sessionEnrollment.createMany({
        data: students.map((student) => ({ sessionId: id, studentId: student.id })),
        skipDuplicates: true,
      });
    }
    await tx.session.update({ where: { id }, data: { status: "ACTIVE", startedAt: new Date() } });
    const notificationIds = await createUserNotifications(tx, students.map((student) => student.id), {
      kind: "SESSION_STARTED",
      title: "Le pointage est ouvert",
      body: "Votre séance vient de démarrer. Ouvrez Presence Plus pour enregistrer votre présence.",
      href: "/student/check-in",
      dedupeKey: `session-started:${id}`,
      expiresAt: session.scheduledEndAt,
    });
    return { kind: "STARTED" as const, notificationIds };
  }, SERIALIZABLE_TRANSACTION_OPTIONS);
  if (result.kind === "OUTSIDE_WINDOW") return failure({ ok: false, message: "La session peut démarrer au plus tôt 30 minutes avant son horaire et avant sa fin prévue." });
  if (result.kind === "ACTIVE_EXISTS") return failure({ ok: false, message: "Clôturez la session active avant d'en démarrer une autre." });
  if (result.kind !== "STARTED") return failure({ ok: false, message: "Cette session ne peut pas être démarrée." });
  await audit(viewer.id, "START_SESSION", "Session", id);
  await deliverNotificationPush(result.notificationIds).catch(() => undefined);
  return success(viewer, "Session démarrée. Le pointage est ouvert.", ["sessions"]);
}

export async function cancelSessionAction(id: string, reason?: string) {
  const viewer = await viewerFor("TEACHER");
  if (!viewer) return forbidden();
  if (!reason || reason.trim().length < 5) return failure({ ok: false, message: "Le motif d'annulation doit contenir au moins 5 caractères.", fieldErrors: { reason: "Motif trop court." } });
  const outcome = await prisma.$transaction(async (tx) => {
    const session = await tx.session.findFirst({ where: { id, teacherId: viewer.id, status: "SCHEDULED" } });
    if (!session) return null;
    await tx.session.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: reason.trim() },
    });
    const students = await tx.user.findMany({
      where: { role: "STUDENT", status: "ACTIVE", promotionId: session.promotionId },
      select: { id: true },
    });
    const notificationIds = await createUserNotifications(tx, students.map((student) => student.id), {
      kind: "SESSION_CANCELLED",
      title: "Séance annulée",
      body: `La séance du ${toAcademicDate(session.scheduledStartAt)} à ${toAcademicTime(session.scheduledStartAt)} a été annulée.`,
      href: "/student/schedule",
      dedupeKey: `session-cancelled:${id}`,
    });
    return { notificationIds };
  }, SERIALIZABLE_TRANSACTION_OPTIONS);
  if (!outcome) return failure({ ok: false, message: "Seule une session planifiée peut être annulée." });
  await audit(viewer.id, "CANCEL_SESSION", "Session", id, { reason });
  await deliverNotificationPush(outcome.notificationIds).catch(() => undefined);
  return success(viewer, "Session annulée.", ["sessions"]);
}

export async function completeSessionAction(id: string) {
  const viewer = await viewerFor("TEACHER");
  if (!viewer) return forbidden();
  const outcome = await prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id } });
    if (!session || session.teacherId !== viewer.id || session.status !== "ACTIVE") return null;
    const students = await tx.sessionEnrollment.findMany({ where: { sessionId: id }, select: { studentId: true } });
    const existing = await tx.attendance.findMany({ where: { sessionId: id }, select: { studentId: true } });
    const existingIds = new Set(existing.map((item) => item.studentId));
    const absent = students.filter((student) => !existingIds.has(student.studentId));
    if (absent.length) {
      await tx.attendance.createMany({
        data: absent.map((student) => ({ studentId: student.studentId, sessionId: id, status: "ABSENT", source: "MANUAL", note: "Absence enregistrée automatiquement à la clôture." })),
        skipDuplicates: true,
      });
    }
    await tx.session.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date() } });
    const finalAttendances = await tx.attendance.findMany({
      where: { sessionId: id, studentId: { in: students.map((student) => student.studentId) } },
      select: { studentId: true, status: true },
    });
    const recipientsByStatus = new Map<AttendanceStatus, string[]>();
    for (const attendance of finalAttendances) {
      recipientsByStatus.set(attendance.status, [
        ...(recipientsByStatus.get(attendance.status) ?? []),
        attendance.studentId,
      ]);
    }
    const statusMessages: Record<AttendanceStatus, string> = {
      PRESENT: "Votre présence a été confirmée pour cette séance.",
      LATE: "Votre présence a été enregistrée avec un retard.",
      ABSENT: "Vous avez été enregistré comme absent à cette séance.",
      EXCUSED: "Votre absence justifiée a été confirmée pour cette séance.",
    };
    const notificationIds: string[] = [];
    for (const [status, studentIds] of recipientsByStatus) {
      notificationIds.push(...await createUserNotifications(tx, studentIds, {
        kind: "ATTENDANCE_ALERT",
        title: "Séance clôturée",
        body: statusMessages[status],
        href: "/student/history",
        dedupeKey: `session-completed:${id}`,
      }));
    }
    return { missing: absent.length, notificationIds };
  }, SERIALIZABLE_TRANSACTION_OPTIONS);
  if (outcome === null) return failure({ ok: false, message: "Cette session n’est pas active." });
  await audit(viewer.id, "COMPLETE_SESSION", "Session", id, { automaticAbsences: outcome.missing });
  await deliverNotificationPush(outcome.notificationIds).catch(() => undefined);
  return success(viewer, `Session clôturée. ${outcome.missing} absence(s) enregistrée(s).`, ["sessions", "attendances"]);
}

export async function saveAttendanceAction(sessionId: string, input: AttendanceInput) {
  const viewer = await viewerFor("TEACHER");
  if (!viewer) return forbidden();
  const state = await getAcademicSnapshot(viewer);
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return failure({ ok: false, message: "Session introuvable." });
  const existing = state.attendances.some((item) => item.sessionId === sessionId && item.studentId === input.studentId);
  const validation = validateAttendanceInput(state, sessionId, input, session.status === "COMPLETED");
  if (!validation.ok) return failure(validation);
  const checkedInAt = input.checkedInAt ? fromAcademicDateTime(session.date, input.checkedInAt) : null;
  const automaticStatus = session.status === "ACTIVE" && checkedInAt && ["PRESENT", "LATE"].includes(input.status)
    ? checkedInAt.getTime() > fromAcademicDateTime(session.date, session.startTime).getTime() + (session.lateThresholdMinutes ?? 10) * 60_000
      ? "LATE"
      : "PRESENT"
    : input.status;
  const notificationIds = await prisma.$transaction(async (tx) => {
    await tx.attendance.upsert({
      where: { studentId_sessionId: { studentId: input.studentId, sessionId } },
      create: { studentId: input.studentId, sessionId, status: automaticStatus, source: "MANUAL", checkedInAt, note: input.note?.trim() || null, correctionReason: session.status === "COMPLETED" ? input.correctionReason?.trim() || null : null, correctedAt: session.status === "COMPLETED" ? new Date() : null, correctedById: session.status === "COMPLETED" ? viewer.id : null },
      update: { status: automaticStatus, source: "MANUAL", checkedInAt, note: input.note?.trim() || null, correctionReason: input.correctionReason?.trim() || null, correctedAt: session.status === "COMPLETED" ? new Date() : null, correctedById: session.status === "COMPLETED" ? viewer.id : null },
    });
    if (session.status !== "COMPLETED") return [];
    return createUserNotifications(tx, [input.studentId], {
      kind: "ATTENDANCE_ALERT",
      title: "Présence corrigée",
      body: "Votre feuille de présence a été corrigée. Consultez votre historique pour voir le nouvel état.",
      href: "/student/history",
      dedupeKey: `attendance-corrected:${sessionId}:${input.studentId}`,
    });
  }, SERIALIZABLE_TRANSACTION_OPTIONS);
  await audit(viewer.id, existing ? "CORRECT_ATTENDANCE" : "CREATE_ATTENDANCE", "Attendance", `${sessionId}:${input.studentId}`);
  await deliverNotificationPush(notificationIds).catch(() => undefined);
  return success(viewer, validation.message, ["attendances", "sessions"]);
}

function parseCode(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { sessionId?: unknown; token?: unknown; expiresAt?: unknown };
    if (typeof parsed.sessionId === "string" && typeof parsed.token === "string") return { sessionId: parsed.sessionId, token: parsed.token, expiresAt: Number(parsed.expiresAt) };
  } catch {}
  return { token: raw.trim(), sessionId: undefined, expiresAt: undefined };
}

export async function getQrTokenAction(sessionId: string) {
  const viewer = await viewerFor("TEACHER");
  if (!viewer) return { ok: false as const, message: "Sélectionnez le profil enseignant." };
  const session = await prisma.session.findFirst({
    where: { id: sessionId, teacherId: viewer.id, status: "ACTIVE", scheduledEndAt: { gt: new Date() } },
    select: { id: true },
  });
  if (!session) return { ok: false as const, message: "Le QR est disponible uniquement pour une session active." };
  const token = createServerQrToken(sessionId);
  return { ok: true as const, token: token.value, expiresAt: token.expiresAt, payload: JSON.stringify({ sessionId, token: token.value, expiresAt: token.expiresAt }) };
}

export async function validateStudentCodeAction(raw: string, source: Extract<AttendanceSource, "QR" | "STUDENT_CODE">): Promise<CheckInActionResult> {
  const viewer = await viewerFor("STUDENT");
  if (!viewer) return { ok: false, code: "STUDENT_INACTIVE", message: "Sélectionnez le profil étudiant." };
  if (source !== "QR" && source !== "STUDENT_CODE") {
    return { ok: false, code: "INVALID", message: "Source de pointage invalide." };
  }
  const parsed = parseCode(raw);
  const student = await prisma.user.findFirst({ where: { id: viewer.id, role: "STUDENT", status: "ACTIVE" } });
  if (!student?.promotionId) return { ok: false, code: "STUDENT_INACTIVE", message: "Votre compte étudiant n’est pas actif." };
  const now = new Date();
  const sessions = await prisma.session.findMany({
    where: { status: "ACTIVE", promotionId: student.promotionId, scheduledEndAt: { gt: now } },
    select: { id: true },
  });
  if (parsed.sessionId) {
    const requested = await prisma.session.findUnique({
      where: { id: parsed.sessionId },
      select: { id: true, status: true, promotionId: true, scheduledEndAt: true },
    });
    if (!requested) return { ok: false, code: "INVALID", message: "Ce QR code n’est pas reconnu." };
    if (requested.status !== "ACTIVE" || requested.scheduledEndAt <= now) return { ok: false, code: "SESSION_CLOSED", message: "Le pointage de cette session est fermé." };
    if (requested.promotionId !== student.promotionId) return { ok: false, code: "WRONG_PROMOTION", message: "Cette session ne concerne pas votre promotion." };
  }
  const session = parsed.sessionId ? sessions.find((item) => item.id === parsed.sessionId) : sessions.find((item) => matchesServerQrToken(item.id, parsed.token));
  if (!session) return { ok: false, code: "INVALID", message: "Code invalide ou session indisponible." };
  if (!matchesServerQrToken(session.id, parsed.token)) return { ok: false, code: parsed.expiresAt && parsed.expiresAt < Date.now() ? "EXPIRED" : "INVALID", message: "Ce code est invalide ou expiré." };
  const existing = await prisma.attendance.findUnique({ where: { studentId_sessionId: { studentId: viewer.id, sessionId: session.id } } });
  const issued = createPreviewReceipt(session.id, viewer.id, parsed.token, source);
  const preview: CheckInPreview = { sessionId: session.id, studentId: viewer.id, token: parsed.token.toUpperCase(), source, validatedAt: Date.now(), confirmationExpiresAt: issued.expiresAt, receipt: issued.receipt };
  return {
    ok: true,
    preview,
    alreadyRecorded: Boolean(existing),
    patch: await getAcademicPatch(viewer, ["sessions", "attendances"]),
  };
}

export async function confirmStudentCheckInAction(input: StudentCheckInInput): Promise<CheckInActionResult> {
  const viewer = await viewerFor("STUDENT");
  if (!viewer) return { ok: false, code: "STUDENT_INACTIVE", message: "Sélectionnez le profil étudiant." };
  const confirmedAt = new Date();
  if (
    input.studentId !== viewer.id ||
    (input.source !== "QR" && input.source !== "STUDENT_CODE") ||
    !input.receipt ||
    !verifyPreviewReceipt(input.sessionId, viewer.id, input.token, input.source, input.receipt, confirmedAt.getTime())
  ) {
    return { ok: false, code: "PREVIEW_EXPIRED", message: "La confirmation a expiré. Scannez le code à nouveau." };
  }
  const session = await prisma.session.findFirst({
    where: {
      id: input.sessionId,
      status: "ACTIVE",
      scheduledEndAt: { gt: confirmedAt },
      promotion: { users: { some: { id: viewer.id, status: "ACTIVE" } } },
    },
  });
  if (!session) return { ok: false, code: "SESSION_CLOSED", message: "Le pointage de cette session est fermé." };
  const existing = await prisma.attendance.findUnique({ where: { studentId_sessionId: { studentId: viewer.id, sessionId: session.id } } });
  if (existing) return { ok: true, preview: input, alreadyRecorded: true, patch: await getAcademicPatch(viewer, ["attendances", "sessions"]) };
  const checkedInAt = confirmedAt;
  const lateAfter = new Date(session.scheduledStartAt.getTime() + session.lateThresholdMinutes * 60_000);
  try {
    await prisma.attendance.create({ data: { studentId: viewer.id, sessionId: session.id, source: input.source, checkedInAt, status: checkedInAt > lateAfter ? "LATE" : "PRESENT" } });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { ok: true, preview: input, alreadyRecorded: true, patch: await getAcademicPatch(viewer, ["attendances", "sessions"]) };
    }
    throw error;
  }
  await audit(viewer.id, "STUDENT_CHECK_IN", "Attendance", `${session.id}:${viewer.id}`, { source: input.source });
  return { ok: true, preview: input, alreadyRecorded: false, patch: await getAcademicPatch(viewer, ["attendances", "sessions"]) };
}

export async function createCorrectionRequestAction(input: CorrectionRequestInput) {
  const viewer = await viewerFor("STUDENT");
  if (!viewer) return forbidden();
  const normalized = { ...input, studentId: viewer.id };
  const state = await getAcademicSnapshot(viewer);
  const validation = validateCorrectionRequest(state, normalized);
  if (!validation.ok) return failure(validation);
  const outcome = await prisma.$transaction(async (tx) => {
    // The student row is a stable lock target that serializes correction requests for this actor.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${viewer.id} FOR UPDATE`;
    const session = await tx.session.findUnique({ where: { id: input.sessionId } });
    if (!session) return { kind: "SESSION_MISSING" as const };
    const pending = await tx.attendanceCorrectionRequest.findFirst({
      where: { sessionId: input.sessionId, studentId: viewer.id, status: "PENDING" },
      select: { id: true },
    });
    if (pending) return { kind: "PENDING_EXISTS" as const };
    const attendance = await tx.attendance.findUnique({
      where: { studentId_sessionId: { studentId: viewer.id, sessionId: input.sessionId } },
    });
    if (attendance?.status === input.requestedStatus) return { kind: "STATUS_UNCHANGED" as const };
    const request = await tx.attendanceCorrectionRequest.create({
      data: {
        sessionId: input.sessionId,
        attendanceId: attendance?.id,
        studentId: viewer.id,
        teacherId: session.teacherId,
        requestedStatus: input.requestedStatus,
        reason: input.reason.trim(),
      },
      select: { id: true },
    });
    const notificationIds = await createUserNotifications(tx, [session.teacherId], {
      kind: "CORRECTION_REQUESTED",
      title: "Nouvelle demande de correction",
      body: "Un étudiant demande la vérification d’une présence.",
      href: `/teacher/corrections?request=${request.id}`,
      dedupeKey: `correction-requested:${request.id}`,
    });
    return { kind: "CREATED" as const, id: request.id, notificationIds };
  }, SERIALIZABLE_TRANSACTION_OPTIONS);
  if (outcome.kind === "SESSION_MISSING") return failure({ ok: false, message: "Session introuvable." });
  if (outcome.kind === "PENDING_EXISTS") return failure({ ok: false, message: "Une demande est déjà en attente pour cette session." });
  if (outcome.kind === "STATUS_UNCHANGED") return failure({ ok: false, message: "Le statut demandé est déjà celui enregistré." });
  await audit(viewer.id, "CREATE_CORRECTION_REQUEST", "AttendanceCorrectionRequest", outcome.id);
  await deliverNotificationPush(outcome.notificationIds).catch(() => undefined);
  return success(viewer, validation.message, ["correctionRequests"], { id: outcome.id });
}

export async function cancelCorrectionRequestAction(id: string) {
  const viewer = await viewerFor("STUDENT");
  if (!viewer) return forbidden();
  const outcome = await prisma.$transaction(async (tx) => {
    const request = await tx.attendanceCorrectionRequest.findFirst({
      where: { id, studentId: viewer.id, status: "PENDING" },
      select: { id: true, teacherId: true },
    });
    if (!request) return null;
    await tx.attendanceCorrectionRequest.update({ where: { id }, data: { status: "CANCELLED" } });
    const notificationIds = await createUserNotifications(tx, [request.teacherId], {
      kind: "CORRECTION_REQUESTED",
      title: "Demande de correction annulée",
      body: "L’étudiant a annulé sa demande de correction.",
      href: "/teacher/corrections",
      dedupeKey: `correction-requested:${request.id}`,
    });
    return { notificationIds };
  }, SERIALIZABLE_TRANSACTION_OPTIONS);
  if (!outcome) return failure({ ok: false, message: "Cette demande ne peut plus être annulée." });
  await audit(viewer.id, "CANCEL_CORRECTION_REQUEST", "AttendanceCorrectionRequest", id);
  await deliverNotificationPush(outcome.notificationIds).catch(() => undefined);
  return success(viewer, "Demande annulée.", ["correctionRequests"]);
}

export async function resolveCorrectionRequestAction(input: CorrectionResolutionInput) {
  const viewer = await viewerFor("TEACHER");
  if (!viewer) return forbidden();
  if (input.reason.trim().length < 5) return failure({ ok: false, message: "Expliquez votre décision en au moins 5 caractères.", fieldErrors: { reason: "Motif trop court." } });
  if (input.decision === "APPROVE" && !input.resolvedStatus) return failure({ ok: false, message: "Choisissez le statut final.", fieldErrors: { resolvedStatus: "Statut requis." } });
  if (
    input.decision === "APPROVE" &&
    input.resolvedStatus &&
    ["PRESENT", "LATE"].includes(input.resolvedStatus) &&
    !/^\d{2}:\d{2}$/.test(input.checkedInAt ?? "")
  ) {
    return failure({ ok: false, message: "Indiquez une heure valide.", fieldErrors: { checkedInAt: "Heure requise." } });
  }
  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "AttendanceCorrectionRequest" WHERE id = ${input.requestId} FOR UPDATE`;
    const request = await tx.attendanceCorrectionRequest.findFirst({
      where: { id: input.requestId, teacherId: viewer.id, status: "PENDING" },
      include: { session: true },
    });
    if (!request || request.session.status !== "COMPLETED") return null;
    let finalStatus = input.resolvedStatus;
    if (input.decision === "APPROVE" && input.resolvedStatus) {
      const checkedInAt = ["PRESENT", "LATE"].includes(input.resolvedStatus)
        ? fromAcademicDateTime(toAcademicDate(request.session.scheduledStartAt), input.checkedInAt!)
        : null;
      if (checkedInAt) {
        const lateAfter = new Date(request.session.scheduledStartAt.getTime() + request.session.lateThresholdMinutes * 60_000);
        finalStatus = checkedInAt > lateAfter ? "LATE" : "PRESENT";
      }
      await tx.attendance.upsert({
        where: { studentId_sessionId: { studentId: request.studentId, sessionId: request.sessionId } },
        create: { studentId: request.studentId, sessionId: request.sessionId, status: finalStatus!, source: "MANUAL", checkedInAt, note: finalStatus === "EXCUSED" ? request.reason : null, correctionReason: input.reason.trim(), correctedAt: new Date(), correctedById: viewer.id },
        update: { status: finalStatus!, checkedInAt, note: finalStatus === "EXCUSED" ? request.reason : null, correctionReason: input.reason.trim(), correctedAt: new Date(), correctedById: viewer.id },
      });
    }
    await tx.attendanceCorrectionRequest.update({ where: { id: request.id }, data: { status: input.decision === "APPROVE" ? "APPROVED" : "REJECTED", decisionReason: input.reason.trim(), resolvedStatus: input.decision === "APPROVE" ? finalStatus : null, resolvedById: viewer.id, resolvedAt: new Date() } });
    const approved = input.decision === "APPROVE";
    const notificationIds = await createUserNotifications(tx, [request.studentId], {
      kind: "CORRECTION_RESOLVED",
      title: approved ? "Correction acceptée" : "Correction refusée",
      body: approved
        ? "Votre demande a été acceptée. Consultez votre historique pour voir la correction."
        : "Votre demande a été examinée. Consultez votre historique pour voir la décision.",
      href: "/student/history",
      dedupeKey: `correction-resolved:${request.id}`,
    });
    return { requestId: request.id, finalStatus, notificationIds };
  }, SERIALIZABLE_TRANSACTION_OPTIONS);
  if (!outcome) return failure({ ok: false, message: "Cette demande n’est plus disponible." });
  await audit(
    viewer.id,
    input.decision === "APPROVE" ? "APPROVE_CORRECTION_REQUEST" : "REJECT_CORRECTION_REQUEST",
    "AttendanceCorrectionRequest",
    outcome.requestId,
    input.decision === "APPROVE" ? { finalStatus: outcome.finalStatus } : undefined,
  );
  await deliverNotificationPush(outcome.notificationIds).catch(() => undefined);
  return success(viewer, input.decision === "APPROVE" ? "Correction acceptée et appliquée." : "Demande refusée.", ["correctionRequests", "attendances", "sessions"]);
}
