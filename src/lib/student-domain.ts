import type { AttendanceRecord } from "@/types";
import type { AcademicDataState, AdminAnomaly, MutationResult } from "@/types/admin";
import type {
  CheckInPreview,
  CheckInValidationResult,
  CorrectionRequestInput,
  StudentCheckInInput,
} from "@/types/student";
import { createQrToken, deriveAttendanceStatus } from "./academic-domain";
import { academicDateTimeKey, currentAcademicDate, currentAcademicDateTimeKey } from "./academic-calendar";
import { QR_ROTATION_MS } from "./qr-constants";

function sessionTeacherId(state: AcademicDataState, courseId: string) {
  return state.courses.find((course) => course.id === courseId)?.teacherId;
}

export function getStudentSessions(state: AcademicDataState, studentId: string) {
  const student = state.users.find((user) => user.id === studentId && user.role === "STUDENT");
  if (!student?.promotionId) return [];
  return state.sessions
    .filter((session) => {
      const promotionId = session.promotionId ??
        state.courses.find((course) => course.id === session.courseId)?.promotionId;
      return promotionId === student.promotionId;
    })
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
}

export function getStudentHistory(state: AcademicDataState, studentId: string) {
  const currentSessionIds = new Set(getStudentSessions(state, studentId).map((session) => session.id));
  const historicalSessionIds = new Set([
    ...state.sessions
      .filter((session) => session.enrolledStudentIds?.includes(studentId))
      .map((session) => session.id),
    ...state.attendances.filter((record) => record.studentId === studentId).map((record) => record.sessionId),
    ...state.correctionRequests.filter((request) => request.studentId === studentId).map((request) => request.sessionId),
  ]);
  return state.sessions
    .filter((session) => currentSessionIds.has(session.id) || historicalSessionIds.has(session.id))
    .filter((session) => session.status === "COMPLETED")
    .map((session) => {
      const requests = state.correctionRequests
        .filter((request) => request.sessionId === session.id && request.studentId === studentId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return {
        session,
        attendance: state.attendances.find(
          (record) => record.sessionId === session.id && record.studentId === studentId,
        ),
        requests,
        request: requests[0],
      };
    })
    .sort((a, b) => `${b.session.date}${b.session.startTime}`.localeCompare(`${a.session.date}${a.session.startTime}`));
}

export function getStudentStats(state: AcademicDataState, studentId: string) {
  const history = getStudentHistory(state, studentId);
  const records = history.map((item) => item.attendance).filter((item): item is AttendanceRecord => Boolean(item));
  const eligible = records.filter((record) => record.status !== "EXCUSED");
  const attended = eligible.filter((record) => ["PRESENT", "LATE"].includes(record.status)).length;
  const present = eligible.filter((record) => record.status === "PRESENT").length;
  const late = eligible.filter((record) => record.status === "LATE").length;
  const absent = eligible.filter((record) => record.status === "ABSENT").length;
  return {
    attendanceRate: eligible.length ? Math.round(attended / eligible.length * 100) : 0,
    punctualityRate: attended ? Math.round(present / attended * 100) : 100,
    eligibleCount: eligible.length,
    attendedCount: attended,
    lateCount: late,
    absentCount: absent,
    excusedCount: records.filter((record) => record.status === "EXCUSED").length,
    completedCount: history.length,
    recordedCount: records.length,
    missingCount: history.length - records.length,
  };
}

function parseQrPayload(raw: string) {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") return null;
    const payload = value as Record<string, unknown>;
    if (
      typeof payload.sessionId === "string" &&
      typeof payload.token === "string" &&
      typeof payload.expiresAt === "number"
    ) {
      return {
        sessionId: payload.sessionId,
        token: payload.token.trim().toLocaleUpperCase("fr"),
        expiresAt: payload.expiresAt,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function tokenMatches(sessionId: string, token: string, now: number) {
  return [createQrToken(sessionId, now), createQrToken(sessionId, now - QR_ROTATION_MS)]
    .some((candidate) => candidate.value === token);
}

export function validateStudentCheckIn(
  state: AcademicDataState,
  rawCode: string,
  studentId: string,
  source: CheckInPreview["source"],
  now = Date.now(),
): CheckInValidationResult {
  const student = state.users.find((user) => user.id === studentId && user.role === "STUDENT");
  if (!student || student.status !== "ACTIVE" || !student.promotionId) {
    return { ok: false, code: "STUDENT_INACTIVE", message: "Votre compte étudiant n’est pas actif." };
  }

  const payload = parseQrPayload(rawCode.trim());
  const token = (payload?.token ?? rawCode.trim()).toLocaleUpperCase("fr");
  let candidates = getStudentSessions(state, studentId);

  if (payload) {
    const session = state.sessions.find((item) => item.id === payload.sessionId);
    if (!session) return { ok: false, code: "INVALID", message: "Ce QR code n’est pas reconnu." };
    if (session.status !== "ACTIVE") {
      return { ok: false, code: "SESSION_CLOSED", message: "Le pointage de cette session est fermé." };
    }
    if (!candidates.some((item) => item.id === session.id)) {
      return { ok: false, code: "WRONG_PROMOTION", message: "Cette session ne concerne pas votre promotion." };
    }
    candidates = [session];
    if (!tokenMatches(session.id, token, now)) {
      return {
        ok: false,
        code: payload.expiresAt < now ? "EXPIRED" : "INVALID",
        message: payload.expiresAt < now ? "Ce QR code a expiré. Scannez le nouveau code affiché." : "Ce QR code est invalide.",
      };
    }
  } else {
    candidates = candidates.filter(
      (session) => session.status === "ACTIVE" && tokenMatches(session.id, token, now),
    );
  }

  const session = candidates.find((item) => item.status === "ACTIVE");
  if (!session) return { ok: false, code: "INVALID", message: "Code invalide ou session indisponible." };

  const alreadyRecorded = state.attendances.some(
    (record) => record.sessionId === session.id && record.studentId === studentId,
  );
  return {
    ok: true,
    alreadyRecorded,
    preview: {
      sessionId: session.id,
      studentId,
      token,
      source,
      validatedAt: now,
      confirmationExpiresAt: now + 60_000,
    },
  };
}

export function validateCheckInConfirmation(
  state: AcademicDataState,
  input: StudentCheckInInput,
): CheckInValidationResult {
  if (input.confirmedAt > input.confirmationExpiresAt) {
    return { ok: false, code: "PREVIEW_EXPIRED", message: "La confirmation a expiré. Scannez le code à nouveau." };
  }
  const student = state.users.find((user) => user.id === input.studentId);
  const session = state.sessions.find((item) => item.id === input.sessionId);
  if (!student || student.status !== "ACTIVE") {
    return { ok: false, code: "STUDENT_INACTIVE", message: "Votre compte étudiant n’est pas actif." };
  }
  if (!session || session.status !== "ACTIVE") {
    return { ok: false, code: "SESSION_CLOSED", message: "Le pointage de cette session est maintenant fermé." };
  }
  if (session.promotionId !== student.promotionId) {
    return { ok: false, code: "WRONG_PROMOTION", message: "Cette session ne concerne pas votre promotion." };
  }
  const alreadyRecorded = state.attendances.some(
    (record) => record.sessionId === session.id && record.studentId === input.studentId,
  );
  return { ok: true, alreadyRecorded, preview: input };
}

export function attendanceFromCheckIn(
  state: AcademicDataState,
  input: StudentCheckInInput,
  id: string,
): AttendanceRecord {
  const session = state.sessions.find((item) => item.id === input.sessionId)!;
  const student = state.users.find((item) => item.id === input.studentId)!;
  const checkedInAt = new Date(input.confirmedAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return {
    id,
    sessionId: session.id,
    studentId: student.id,
    studentName: student.name,
    matricule: student.matricule ?? "—",
    promotion: session.promotion,
    checkedInAt,
    status: deriveAttendanceStatus(
      session.startTime,
      checkedInAt,
      session.lateThresholdMinutes ?? 10,
    ),
    source: input.source,
  };
}

export function validateCorrectionRequest(
  state: AcademicDataState,
  input: CorrectionRequestInput,
): MutationResult {
  const session = state.sessions.find((item) => item.id === input.sessionId);
  const student = state.users.find((item) => item.id === input.studentId);
  if (!session || session.status !== "COMPLETED") {
    return { ok: false, message: "Une demande concerne uniquement une session clôturée." };
  }
  const hasHistoricalRecord = state.attendances.some(
    (record) => record.sessionId === input.sessionId && record.studentId === input.studentId,
  ) || state.correctionRequests.some(
    (request) => request.sessionId === input.sessionId && request.studentId === input.studentId,
  );
  if (
    !student ||
    student.role !== "STUDENT" ||
    (session.promotionId !== student.promotionId && !hasHistoricalRecord)
  ) {
    return { ok: false, message: "Cette session ne concerne pas cet étudiant." };
  }
  if (input.reason.trim().length < 10) {
    return {
      ok: false,
      message: "Expliquez votre demande en au moins 10 caractères.",
      fieldErrors: { reason: "Motif trop court." },
    };
  }
  const attendance = state.attendances.find(
    (record) => record.sessionId === input.sessionId && record.studentId === input.studentId,
  );
  if (attendance?.status === input.requestedStatus) {
    return { ok: false, message: "Le statut demandé est déjà celui enregistré." };
  }
  if (state.correctionRequests.some((request) =>
    request.sessionId === input.sessionId &&
    request.studentId === input.studentId &&
    request.status === "PENDING")) {
    return { ok: false, message: "Une demande est déjà en attente pour cette session." };
  }
  return { ok: true, message: "Demande envoyée à l’enseignant." };
}

export function getStudentNotifications(
  state: AcademicDataState,
  studentId: string,
): AdminAnomaly[] {
  const notifications: AdminAnomaly[] = [];
  const sessions = getStudentSessions(state, studentId);
  const nowKey = currentAcademicDateTimeKey();
  for (const session of sessions) {
    const attendance = state.attendances.find(
      (record) => record.sessionId === session.id && record.studentId === studentId,
    );
    if (
      session.status === "ACTIVE" &&
      academicDateTimeKey(session.date, session.endTime) > nowKey &&
      !attendance
    ) {
      notifications.push({
        id: `check-in-${session.id}`,
        severity: "HIGH",
        title: "Pointage ouvert",
        detail: `${session.courseCode} accepte les présences maintenant.`,
        href: "/student/check-in",
      });
    } else if (
      session.status === "SCHEDULED" &&
      session.date === currentAcademicDate() &&
      academicDateTimeKey(session.date, session.startTime) > nowKey
    ) {
      notifications.push({
        id: `upcoming-${session.id}`,
        severity: "LOW",
        title: "Séance aujourd’hui",
        detail: `${session.courseCode} commence à ${session.startTime}.`,
        href: "/student/schedule",
      });
    }
  }
  for (const request of state.correctionRequests.filter(
    (item) => item.studentId === studentId && ["APPROVED", "REJECTED"].includes(item.status),
  ).slice(-2)) {
    notifications.push({
      id: `request-${request.id}`,
      severity: request.status === "APPROVED" ? "LOW" : "MEDIUM",
      title: request.status === "APPROVED" ? "Correction acceptée" : "Correction refusée",
      detail: request.decisionReason ?? "Votre demande a été traitée.",
      href: "/student/history",
    });
  }
  const stats = getStudentStats(state, studentId);
  if (stats.completedCount && stats.attendanceRate < 80) {
    notifications.push({
      id: "attendance-alert",
      severity: "HIGH",
      title: "Présence sous 80 %",
      detail: `Votre taux actuel est de ${stats.attendanceRate} %.`,
      href: "/student/history",
    });
  }
  return notifications;
}

export function getTeacherCorrectionNotifications(
  state: AcademicDataState,
  teacherId: string,
): AdminAnomaly[] {
  return state.correctionRequests
    .filter((request) => request.teacherId === teacherId && request.status === "PENDING")
    .map((request) => {
      const student = state.users.find((user) => user.id === request.studentId);
      const session = state.sessions.find((item) => item.id === request.sessionId);
      return {
        id: `correction-${request.id}`,
        severity: "MEDIUM" as const,
        title: "Correction demandée",
        detail: `${student?.name ?? "Un étudiant"} · ${session?.courseCode ?? "Session"}`,
        href: `/teacher/corrections?request=${request.id}`,
      };
    });
}

export function teacherIdForSession(state: AcademicDataState, sessionId: string) {
  const session = state.sessions.find((item) => item.id === sessionId);
  return session?.teacherId ?? (session ? sessionTeacherId(state, session.courseId) : undefined);
}
