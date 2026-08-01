"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  fromAcademicDateTime,
  getAcademicPatch,
  getAcademicSnapshot,
  toAcademicDate,
  type AcademicCollection,
  type AcademicPatch,
} from "@/lib/academic-repository";
import { getDemoViewer, type DemoViewer } from "@/lib/demo-viewer";
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
  AdminCourseInput,
  AdminPromotionInput,
  AdminUserInput,
  AttendanceInput,
  MutationResult,
  TeacherSessionInput,
} from "@/types/admin";
import type {
  CheckInPreview,
  CheckInValidationResult,
  CorrectionRequestInput,
  CorrectionResolutionInput,
  StudentCheckInInput,
} from "@/types/student";
import type { AttendanceSource } from "@/types";
import type { Prisma } from "@/generated/prisma/client";

export type AcademicActionResult<T = undefined> = MutationResult & {
  patch?: AcademicPatch;
  value?: T;
};

type CheckInActionResult = CheckInValidationResult & { patch?: AcademicPatch };

async function success<T = undefined>(viewer: DemoViewer, message: string, keys: AcademicCollection[], value?: T): Promise<AcademicActionResult<T>> {
  return { ok: true, message, patch: await getAcademicPatch(viewer, keys), value };
}

function failure(result: MutationResult): AcademicActionResult {
  return result;
}

async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: { actorId, action, entityType, entityId, metadata: metadata as Prisma.InputJsonValue | undefined },
  });
}

async function viewerFor(role?: DemoViewer["role"]) {
  const viewer = await getDemoViewer();
  return viewer && (!role || viewer.role === role) ? viewer : null;
}

function forbidden(): AcademicActionResult {
  return { ok: false, message: "Votre profil de demonstration ne permet pas cette action." };
}

export async function loadAcademicDataAction() {
  const viewer = await viewerFor();
  if (!viewer) throw new Error("Selectionnez un profil de demonstration.");
  return getAcademicSnapshot(viewer);
}

export async function createUserAction(input: AdminUserInput) {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  const state = await getAcademicSnapshot(viewer);
  const validation = validateUser(state, input);
  if (!validation.ok) return failure(validation);
  const id = randomUUID();
  const passwordHash = await bcrypt.hash(randomUUID(), 12);
  await prisma.user.create({
    data: {
      id,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      status: input.status,
      matricule: input.role === "STUDENT" ? input.matricule?.trim().toUpperCase() : null,
      passwordHash,
      ...(input.role === "STUDENT" && input.promotionId
        ? { promotion: { connect: { id: input.promotionId } } }
        : {}),
    },
  });
  await audit(viewer.id, "CREATE_USER", "User", id);
  return success(viewer, validation.message, ["users", "auditLogs"], { id });
}

export async function updateUserAction(id: string, input: AdminUserInput) {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  const state = await getAcademicSnapshot(viewer);
  const validation = validateUser(state, input, id);
  if (!validation.ok) return failure(validation);
  const current = state.users.find((user) => user.id === id);
  if (!current) return failure({ ok: false, message: "Utilisateur introuvable." });
  if (current.role !== input.role) {
    const hasDependencies = state.courses.some((course) => course.teacherId === id) ||
      state.sessions.some((session) => session.teacherId === id) ||
      state.attendances.some((attendance) => attendance.studentId === id) ||
      state.correctionRequests.some((request) => request.studentId === id || request.teacherId === id);
    if (hasDependencies) return failure({ ok: false, message: "Le rôle ne peut pas changer tant que ce compte possède un historique métier.", fieldErrors: { role: "Désactivez le compte ou conservez son rôle." } });
  }
  await prisma.user.update({
    where: { id },
    data: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      status: input.status,
      matricule: input.role === "STUDENT" ? input.matricule?.trim().toUpperCase() : null,
      promotion: input.role === "STUDENT" && input.promotionId
        ? { connect: { id: input.promotionId } }
        : { disconnect: true },
    },
  });
  await audit(viewer.id, "UPDATE_USER", "User", id);
  return success(viewer, validation.message, ["users", "auditLogs"]);
}

export async function deleteUserAction(id: string) {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  const state = await getAcademicSnapshot(viewer);
  const blockers = getUserDeleteBlockers(state, id, viewer.id);
  if (blockers.length) return failure({ ok: false, message: blockers.join(" ") });
  await prisma.user.delete({ where: { id } });
  await audit(viewer.id, "DELETE_USER", "User", id);
  return success(viewer, "Utilisateur supprimé.", ["users", "auditLogs"]);
}

export async function setUserStatusAction(id: string, status: "ACTIVE" | "INACTIVE") {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  if (id === viewer.id && status === "INACTIVE") {
    return failure({ ok: false, message: "Vous ne pouvez pas désactiver le profil administrateur utilisé." });
  }
  const user = await prisma.user.findUnique({ where: { id }, select: { role: true, promotionId: true } });
  if (!user) return failure({ ok: false, message: "Utilisateur introuvable." });
  if (status === "INACTIVE" && user.role === "TEACHER") {
    const blocking = await prisma.session.count({ where: { teacherId: id, status: { in: ["SCHEDULED", "ACTIVE"] } } });
    if (blocking) return failure({ ok: false, message: `${blocking} session(s) planifiée(s) ou active(s) doivent d'abord être traitées.` });
  }
  if (status === "INACTIVE" && user.role === "STUDENT" && user.promotionId) {
    const blocking = await prisma.session.count({ where: { promotionId: user.promotionId, status: "ACTIVE" } });
    if (blocking) return failure({ ok: false, message: "Cet étudiant appartient à une promotion ayant une session active." });
  }
  await prisma.user.update({ where: { id }, data: { status } });
  await audit(viewer.id, status === "ACTIVE" ? "ACTIVATE_USER" : "DEACTIVATE_USER", "User", id);
  return success(viewer, status === "ACTIVE" ? "Compte activé." : "Compte désactivé.", ["users", "auditLogs"]);
}

export async function createPromotionAction(input: AdminPromotionInput) {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  const state = await getAcademicSnapshot(viewer);
  const validation = validatePromotion(state, input);
  if (!validation.ok) return failure(validation);
  const promotion = await prisma.promotion.create({ data: { ...input, name: input.name.trim(), department: input.department.trim() } });
  await audit(viewer.id, "CREATE_PROMOTION", "Promotion", promotion.id);
  return success(viewer, validation.message, ["promotions", "auditLogs"], { id: promotion.id });
}

export async function updatePromotionAction(id: string, input: AdminPromotionInput) {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  const state = await getAcademicSnapshot(viewer);
  const validation = validatePromotion(state, input, id);
  if (!validation.ok) return failure(validation);
  await prisma.promotion.update({ where: { id }, data: { ...input, name: input.name.trim(), department: input.department.trim() } });
  await audit(viewer.id, "UPDATE_PROMOTION", "Promotion", id);
  return success(viewer, validation.message, ["promotions", "auditLogs"]);
}

export async function deletePromotionAction(id: string) {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  const blockers = getPromotionDeleteBlockers(await getAcademicSnapshot(viewer), id);
  if (blockers.length) return failure({ ok: false, message: blockers.join(" ") });
  await prisma.promotion.delete({ where: { id } });
  await audit(viewer.id, "DELETE_PROMOTION", "Promotion", id);
  return success(viewer, "Promotion supprimée.", ["promotions", "auditLogs"]);
}

export async function createCourseAction(input: AdminCourseInput) {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  const state = await getAcademicSnapshot(viewer);
  const validation = validateCourse(state, input);
  if (!validation.ok) return failure(validation);
  const course = await prisma.course.create({
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
  await audit(viewer.id, "CREATE_COURSE", "Course", course.id);
  return success(viewer, validation.message, ["courses", "auditLogs"], { id: course.id });
}

export async function updateCourseAction(id: string, input: AdminCourseInput) {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  const state = await getAcademicSnapshot(viewer);
  const validation = validateCourse(state, input, id);
  if (!validation.ok) return failure(validation);
  await prisma.course.update({
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
  await audit(viewer.id, "UPDATE_COURSE", "Course", id);
  return success(viewer, validation.message, ["courses", "auditLogs"]);
}

export async function deleteCourseAction(id: string) {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  const blockers = getCourseDeleteBlockers(await getAcademicSnapshot(viewer), id);
  if (blockers.length) return failure({ ok: false, message: blockers.join(" ") });
  await prisma.course.delete({ where: { id } });
  await audit(viewer.id, "DELETE_COURSE", "Course", id);
  return success(viewer, "Cours supprimé.", ["courses", "auditLogs"]);
}

export async function setCourseActiveAction(id: string, active: boolean) {
  const viewer = await viewerFor("ADMIN");
  if (!viewer) return forbidden();
  if (!active) {
    const blocking = await prisma.session.count({ where: { courseId: id, status: { in: ["SCHEDULED", "ACTIVE"] } } });
    if (blocking) return failure({ ok: false, message: `${blocking} session(s) planifiée(s) ou active(s) empêchent la désactivation.` });
  }
  const updated = await prisma.course.updateMany({ where: { id }, data: { active } });
  if (!updated.count) return failure({ ok: false, message: "Cours introuvable." });
  await audit(viewer.id, active ? "ACTIVATE_COURSE" : "DEACTIVATE_COURSE", "Course", id);
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
  const session = await prisma.$transaction(async (tx) => {
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
    return tx.session.create({
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
  }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 20_000 });
  if (!session) return failure({ ok: false, message: "Le cours est inactif ou ce créneau vient d'être réservé." });
  await audit(viewer.id, "CREATE_SESSION", "Session", session.id);
  return success(viewer, validation.message, ["sessions"], { id: session.id });
}

export async function updateSessionAction(id: string, input: TeacherSessionInput) {
  const viewer = await viewerFor("TEACHER");
  if (!viewer) return forbidden();
  const state = await getAcademicSnapshot(viewer);
  const current = state.sessions.find((item) => item.id === id);
  if (!current || current.status !== "SCHEDULED" || current.teacherId !== viewer.id) {
    return failure({ ok: false, message: "Seule une session planifiée de Patrick peut être modifiée." });
  }
  const validation = validateTeacherSession(state, input, viewer.id, id);
  if (!validation.ok) return failure(validation);
  const course = state.courses.find((item) => item.id === input.courseId)!;
  const start = fromAcademicDateTime(input.date, input.startTime);
  const end = fromAcademicDateTime(input.date, input.endTime);
  const updated = await prisma.$transaction(async (tx) => {
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
    if (conflict) return false;
    const result = await tx.session.updateMany({
      where: { id, teacherId: viewer.id, status: "SCHEDULED" },
      data: { name: input.name?.trim() || current.name || current.courseName, description: input.description?.trim() || null, scheduledStartAt: start, scheduledEndAt: end, room: input.room.trim(), lateThresholdMinutes: input.lateThresholdMinutes, courseId: course.id, promotionId: course.promotionId },
    });
    return result.count === 1;
  }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 20_000 });
  if (!updated) return failure({ ok: false, message: "La session a changé ou le créneau vient d'être réservé." });
  await audit(viewer.id, "UPDATE_SESSION", "Session", id);
  return success(viewer, validation.message, ["sessions"]);
}

export async function startSessionAction(id: string) {
  const viewer = await viewerFor("TEACHER");
  if (!viewer) return forbidden();
  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id } });
    if (!session || session.teacherId !== viewer.id || session.status !== "SCHEDULED") return "INVALID" as const;
    const now = new Date();
    if (now < new Date(session.scheduledStartAt.getTime() - 30 * 60_000) || now > session.scheduledEndAt) return "OUTSIDE_WINDOW" as const;
    const active = await tx.session.count({ where: { teacherId: viewer.id, status: "ACTIVE" } });
    if (active) return "ACTIVE_EXISTS" as const;
    await tx.session.update({ where: { id }, data: { status: "ACTIVE", startedAt: new Date() } });
    return "STARTED" as const;
  }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 20_000 });
  if (result === "OUTSIDE_WINDOW") return failure({ ok: false, message: "La session peut démarrer au plus tôt 30 minutes avant son horaire et avant sa fin prévue." });
  if (result === "ACTIVE_EXISTS") return failure({ ok: false, message: "Clôturez la session active avant d'en démarrer une autre." });
  if (result !== "STARTED") return failure({ ok: false, message: "Cette session ne peut pas être démarrée." });
  await audit(viewer.id, "START_SESSION", "Session", id);
  return success(viewer, "Session démarrée. Le pointage est ouvert.", ["sessions"]);
}

export async function cancelSessionAction(id: string, reason?: string) {
  const viewer = await viewerFor("TEACHER");
  if (!viewer) return forbidden();
  if (!reason || reason.trim().length < 5) return failure({ ok: false, message: "Le motif d'annulation doit contenir au moins 5 caractères.", fieldErrors: { reason: "Motif trop court." } });
  const updated = await prisma.session.updateMany({
    where: { id, teacherId: viewer.id, status: "SCHEDULED" },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: reason.trim() },
  });
  if (!updated.count) return failure({ ok: false, message: "Seule une session planifiée peut être annulée." });
  await audit(viewer.id, "CANCEL_SESSION", "Session", id, { reason });
  return success(viewer, "Session annulée.", ["sessions"]);
}

export async function completeSessionAction(id: string) {
  const viewer = await viewerFor("TEACHER");
  if (!viewer) return forbidden();
  const missing = await prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id } });
    if (!session || session.teacherId !== viewer.id || session.status !== "ACTIVE") return null;
    const students = await tx.user.findMany({ where: { role: "STUDENT", status: "ACTIVE", promotionId: session.promotionId }, select: { id: true } });
    const existing = await tx.attendance.findMany({ where: { sessionId: id }, select: { studentId: true } });
    const existingIds = new Set(existing.map((item) => item.studentId));
    const absent = students.filter((student) => !existingIds.has(student.id));
    if (absent.length) {
      await tx.attendance.createMany({
        data: absent.map((student) => ({ studentId: student.id, sessionId: id, status: "ABSENT", source: "MANUAL", note: "Absence enregistrée automatiquement à la clôture." })),
        skipDuplicates: true,
      });
    }
    await tx.session.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date() } });
    return absent.length;
  }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 20_000 });
  if (missing === null) return failure({ ok: false, message: "Cette session n’est pas active." });
  await audit(viewer.id, "COMPLETE_SESSION", "Session", id, { automaticAbsences: missing });
  return success(viewer, `Session clôturée. ${missing} absence(s) enregistrée(s).`, ["sessions", "attendances"]);
}

export async function saveAttendanceAction(sessionId: string, input: AttendanceInput) {
  const viewer = await viewerFor("TEACHER");
  if (!viewer) return forbidden();
  const state = await getAcademicSnapshot(viewer);
  const existing = state.attendances.some((item) => item.sessionId === sessionId && item.studentId === input.studentId);
  const validation = validateAttendanceInput(state, sessionId, input, existing);
  if (!validation.ok) return failure(validation);
  const session = state.sessions.find((item) => item.id === sessionId)!;
  const checkedInAt = input.checkedInAt ? fromAcademicDateTime(session.date, input.checkedInAt) : null;
  const automaticStatus = session.status === "ACTIVE" && checkedInAt && ["PRESENT", "LATE"].includes(input.status)
    ? checkedInAt.getTime() > fromAcademicDateTime(session.date, session.startTime).getTime() + (session.lateThresholdMinutes ?? 10) * 60_000
      ? "LATE"
      : "PRESENT"
    : input.status;
  await prisma.attendance.upsert({
    where: { studentId_sessionId: { studentId: input.studentId, sessionId } },
    create: { studentId: input.studentId, sessionId, status: automaticStatus, source: "MANUAL", checkedInAt, note: input.note?.trim() || null },
    update: { status: automaticStatus, source: "MANUAL", checkedInAt, note: input.note?.trim() || null, correctionReason: input.correctionReason?.trim() || null, correctedAt: existing ? new Date() : null, correctedById: existing ? viewer.id : null },
  });
  await audit(viewer.id, existing ? "CORRECT_ATTENDANCE" : "CREATE_ATTENDANCE", "Attendance", `${sessionId}:${input.studentId}`);
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
  const session = await prisma.session.findFirst({ where: { id: sessionId, teacherId: viewer.id, status: "ACTIVE" }, select: { id: true } });
  if (!session) return { ok: false as const, message: "Le QR est disponible uniquement pour une session active." };
  const token = createServerQrToken(sessionId);
  return { ok: true as const, token: token.value, expiresAt: token.expiresAt, payload: JSON.stringify({ sessionId, token: token.value, expiresAt: token.expiresAt }) };
}

export async function validateStudentCodeAction(raw: string, source: Extract<AttendanceSource, "QR" | "STUDENT_CODE">): Promise<CheckInActionResult> {
  const viewer = await viewerFor("STUDENT");
  if (!viewer) return { ok: false, code: "STUDENT_INACTIVE", message: "Sélectionnez le profil étudiant." };
  const parsed = parseCode(raw);
  const student = await prisma.user.findFirst({ where: { id: viewer.id, role: "STUDENT", status: "ACTIVE" } });
  if (!student?.promotionId) return { ok: false, code: "STUDENT_INACTIVE", message: "Votre compte étudiant n’est pas actif." };
  const sessions = await prisma.session.findMany({ where: { status: "ACTIVE", promotionId: student.promotionId }, select: { id: true } });
  if (parsed.sessionId) {
    const requested = await prisma.session.findUnique({ where: { id: parsed.sessionId }, select: { id: true, status: true, promotionId: true } });
    if (!requested) return { ok: false, code: "INVALID", message: "Ce QR code n’est pas reconnu." };
    if (requested.status !== "ACTIVE") return { ok: false, code: "SESSION_CLOSED", message: "Le pointage de cette session est fermé." };
    if (requested.promotionId !== student.promotionId) return { ok: false, code: "WRONG_PROMOTION", message: "Cette session ne concerne pas votre promotion." };
  }
  const session = parsed.sessionId ? sessions.find((item) => item.id === parsed.sessionId) : sessions.find((item) => matchesServerQrToken(item.id, parsed.token));
  if (!session) return { ok: false, code: "INVALID", message: "Code invalide ou session indisponible." };
  if (!matchesServerQrToken(session.id, parsed.token)) return { ok: false, code: parsed.expiresAt && parsed.expiresAt < Date.now() ? "EXPIRED" : "INVALID", message: "Ce code est invalide ou expiré." };
  const existing = await prisma.attendance.findUnique({ where: { studentId_sessionId: { studentId: viewer.id, sessionId: session.id } } });
  const issued = createPreviewReceipt(session.id, viewer.id, parsed.token);
  const preview: CheckInPreview = { sessionId: session.id, studentId: viewer.id, token: parsed.token.toUpperCase(), source, validatedAt: Date.now(), confirmationExpiresAt: issued.expiresAt, receipt: issued.receipt };
  return { ok: true, preview, alreadyRecorded: Boolean(existing) };
}

export async function confirmStudentCheckInAction(input: StudentCheckInInput): Promise<CheckInActionResult> {
  const viewer = await viewerFor("STUDENT");
  if (!viewer) return { ok: false, code: "STUDENT_INACTIVE", message: "Sélectionnez le profil étudiant." };
  if (input.studentId !== viewer.id || !input.receipt || !verifyPreviewReceipt(input.sessionId, viewer.id, input.token, input.receipt, input.confirmedAt)) {
    return { ok: false, code: "PREVIEW_EXPIRED", message: "La confirmation a expiré. Scannez le code à nouveau." };
  }
  const session = await prisma.session.findFirst({ where: { id: input.sessionId, status: "ACTIVE", promotion: { users: { some: { id: viewer.id, status: "ACTIVE" } } } } });
  if (!session) return { ok: false, code: "SESSION_CLOSED", message: "Le pointage de cette session est fermé." };
  const existing = await prisma.attendance.findUnique({ where: { studentId_sessionId: { studentId: viewer.id, sessionId: session.id } } });
  if (existing) return { ok: true, preview: input, alreadyRecorded: true, patch: await getAcademicPatch(viewer, ["attendances", "sessions"]) };
  const checkedInAt = new Date(input.confirmedAt);
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
  const session = await prisma.session.findUnique({ where: { id: input.sessionId } });
  if (!session) return failure({ ok: false, message: "Session introuvable." });
  const attendance = await prisma.attendance.findUnique({ where: { studentId_sessionId: { studentId: viewer.id, sessionId: input.sessionId } } });
  if (attendance?.status === input.requestedStatus) return failure({ ok: false, message: "Le statut demandé est déjà celui enregistré." });
  const request = await prisma.attendanceCorrectionRequest.create({ data: { sessionId: input.sessionId, attendanceId: attendance?.id, studentId: viewer.id, teacherId: session.teacherId, requestedStatus: input.requestedStatus, reason: input.reason.trim() } });
  await audit(viewer.id, "CREATE_CORRECTION_REQUEST", "AttendanceCorrectionRequest", request.id);
  return success(viewer, validation.message, ["correctionRequests"], { id: request.id });
}

export async function cancelCorrectionRequestAction(id: string) {
  const viewer = await viewerFor("STUDENT");
  if (!viewer) return forbidden();
  const updated = await prisma.attendanceCorrectionRequest.updateMany({ where: { id, studentId: viewer.id, status: "PENDING" }, data: { status: "CANCELLED" } });
  if (!updated.count) return failure({ ok: false, message: "Cette demande ne peut plus être annulée." });
  await audit(viewer.id, "CANCEL_CORRECTION_REQUEST", "AttendanceCorrectionRequest", id);
  return success(viewer, "Demande annulée.", ["correctionRequests"]);
}

export async function resolveCorrectionRequestAction(input: CorrectionResolutionInput) {
  const viewer = await viewerFor("TEACHER");
  if (!viewer) return forbidden();
  if (input.reason.trim().length < 5) return failure({ ok: false, message: "Expliquez votre décision en au moins 5 caractères.", fieldErrors: { reason: "Motif trop court." } });
  const request = await prisma.attendanceCorrectionRequest.findFirst({ where: { id: input.requestId, teacherId: viewer.id, status: "PENDING" }, include: { session: true } });
  if (!request) return failure({ ok: false, message: "Cette demande n’est plus disponible." });
  if (input.decision === "APPROVE" && !input.resolvedStatus) return failure({ ok: false, message: "Choisissez le statut final.", fieldErrors: { resolvedStatus: "Statut requis." } });
  await prisma.$transaction(async (tx) => {
    if (input.decision === "APPROVE" && input.resolvedStatus) {
      const checkedInAt = ["PRESENT", "LATE"].includes(input.resolvedStatus)
        ? fromAcademicDateTime(toAcademicDate(request.session.scheduledStartAt), input.checkedInAt ?? "00:00")
        : null;
      await tx.attendance.upsert({
        where: { studentId_sessionId: { studentId: request.studentId, sessionId: request.sessionId } },
        create: { studentId: request.studentId, sessionId: request.sessionId, status: input.resolvedStatus, source: "MANUAL", checkedInAt, note: input.resolvedStatus === "EXCUSED" ? request.reason : null, correctionReason: input.reason.trim(), correctedAt: new Date(), correctedById: viewer.id },
        update: { status: input.resolvedStatus, checkedInAt, correctionReason: input.reason.trim(), correctedAt: new Date(), correctedById: viewer.id },
      });
    }
    await tx.attendanceCorrectionRequest.update({ where: { id: request.id }, data: { status: input.decision === "APPROVE" ? "APPROVED" : "REJECTED", decisionReason: input.reason.trim(), resolvedStatus: input.decision === "APPROVE" ? input.resolvedStatus : null, resolvedById: viewer.id, resolvedAt: new Date() } });
  }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 20_000 });
  await audit(viewer.id, input.decision === "APPROVE" ? "APPROVE_CORRECTION_REQUEST" : "REJECT_CORRECTION_REQUEST", "AttendanceCorrectionRequest", request.id);
  return success(viewer, input.decision === "APPROVE" ? "Correction acceptée et appliquée." : "Demande refusée.", ["correctionRequests", "attendances", "sessions"]);
}
