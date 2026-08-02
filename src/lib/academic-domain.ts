import { z } from "zod";
import type { AttendanceRecord, SessionSummary } from "@/types";
import type {
  AcademicDataState,
  AdminAnomaly,
  AttendanceInput,
  MutationResult,
  TeacherSessionInput,
} from "@/types/admin";
import { academicDateTimeKey, academicMonth, currentAcademicDate, currentAcademicDateTimeKey } from "./academic-calendar";

const sessionSchema = z.object({
  name: z.string().trim().max(120, "Maximum 120 caractères.").optional(),
  description: z.string().trim().max(500, "Maximum 500 caractères.").optional(),
  courseId: z.string().min(1, "Sélectionnez un cours."),
  date: z.iso.date("Sélectionnez une date valide."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure de début invalide."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure de fin invalide."),
  room: z.string().trim().min(2, "Indiquez une salle."),
  lateThresholdMinutes: z.coerce.number().int().min(0).max(60),
});

function fieldErrors(error: z.ZodError) {
  return Object.fromEntries(
    error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
  );
}

function overlaps(
  first: Pick<TeacherSessionInput, "startTime" | "endTime">,
  second: Pick<TeacherSessionInput, "startTime" | "endTime">,
) {
  return first.startTime < second.endTime && second.startTime < first.endTime;
}

export function validateTeacherSession(
  state: AcademicDataState,
  input: TeacherSessionInput,
  teacherId: string,
  editingId?: string,
): MutationResult {
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Vérifiez les informations de la session.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  if (input.startTime >= input.endTime) {
    return {
      ok: false,
      message: "L’heure de fin doit suivre l’heure de début.",
      fieldErrors: { endTime: "Choisissez une heure plus tardive." },
    };
  }
  const course = state.courses.find(
    (item) => item.id === input.courseId && item.teacherId === teacherId && item.active !== false,
  );
  if (!course) {
    return {
      ok: false,
      message: "Ce cours ne vous est pas affecté.",
      fieldErrors: { courseId: "Cours indisponible." },
    };
  }

  const conflict = state.sessions.find((session) => {
    if (
      session.id === editingId ||
      session.status === "CANCELLED" ||
      session.date !== input.date
    ) {
      return false;
    }
    const sameTeacher = (session.teacherId ?? state.courses.find((item) => item.id === session.courseId)?.teacherId) === teacherId;
    const sameRoom = session.room.trim().toLocaleLowerCase("fr") === input.room.trim().toLocaleLowerCase("fr");
    const samePromotion = (session.promotionId ?? state.courses.find((item) => item.id === session.courseId)?.promotionId) === course.promotionId;
    return (sameTeacher || sameRoom || samePromotion) && overlaps(input, session);
  });

  if (conflict) {
    const conflictCourse = state.courses.find((item) => item.id === conflict.courseId);
    const reason = conflict.room.trim().toLocaleLowerCase("fr") === input.room.trim().toLocaleLowerCase("fr")
      ? `La salle ${input.room.trim()} est déjà occupée.`
      : conflictCourse?.promotionId === course.promotionId
        ? "Cette promotion a déjà un cours sur ce créneau."
        : "Vous avez déjà une session sur ce créneau.";
    return { ok: false, message: reason, fieldErrors: { startTime: reason } };
  }

  if (academicDateTimeKey(input.date, input.endTime) <= currentAcademicDateTimeKey()) {
    return {
      ok: false,
      message: "Une session ne peut pas se terminer dans le passé.",
      fieldErrors: { date: "Choisissez un créneau encore à venir.", endTime: "Cette heure de fin est déjà passée." },
    };
  }

  return {
    ok: true,
    message: editingId ? "Session mise à jour." : "Session planifiée.",
  };
}

export function getSessionRoster(state: AcademicDataState, sessionId: string) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return [];
  const promotionId =
    session.promotionId ??
    state.courses.find((course) => course.id === session.courseId)?.promotionId;

  const frozenStudentIds = session.enrolledStudentIds
    ? new Set(session.enrolledStudentIds)
    : null;

  return state.users
    .filter(
      (user) =>
        user.role === "STUDENT" &&
        (frozenStudentIds
          ? frozenStudentIds.has(user.id)
          : user.status === "ACTIVE" && user.promotionId === promotionId),
    )
    .map((student) => ({
      student,
      attendance: state.attendances.find(
        (record) => record.sessionId === sessionId && record.studentId === student.id,
      ),
    }));
}

export function deriveAttendanceStatus(
  startTime: string,
  checkedInAt: string,
  thresholdMinutes: number,
) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [checkHour, checkMinute] = checkedInAt.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  const check = checkHour * 60 + checkMinute;
  return check > start + thresholdMinutes ? "LATE" as const : "PRESENT" as const;
}

export function validateAttendanceInput(
  state: AcademicDataState,
  sessionId: string,
  input: AttendanceInput,
  correction = false,
): MutationResult {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return { ok: false, message: "Session introuvable." };
  const roster = getSessionRoster(state, sessionId);
  if (!roster.some((item) => item.student.id === input.studentId)) {
    return { ok: false, message: "Cet étudiant n’appartient pas à la promotion." };
  }
  if (session.status === "SCHEDULED" || session.status === "CANCELLED") {
    return { ok: false, message: "Les présences ne sont pas modifiables pour cette session." };
  }
  if (input.status === "EXCUSED" && !input.note?.trim()) {
    return {
      ok: false,
      message: "Le motif de justification est obligatoire.",
      fieldErrors: { note: "Ajoutez le motif de l’absence justifiée." },
    };
  }
  if (session.status === "COMPLETED" && !input.correctionReason?.trim()) {
    return {
      ok: false,
      message: "Le motif de correction est obligatoire.",
      fieldErrors: { correctionReason: "Expliquez cette correction." },
    };
  }
  return { ok: true, message: correction ? "Présence corrigée." : "Présence enregistrée." };
}

export function recountSession(
  session: SessionSummary,
  attendances: AttendanceRecord[],
) {
  const presentCount = attendances.filter(
    (item) =>
      item.sessionId === session.id &&
      ["PRESENT", "LATE"].includes(item.status),
  ).length;
  return { ...session, presentCount };
}

export function getTeacherNotifications(
  state: AcademicDataState,
  teacherId: string,
): AdminAnomaly[] {
  const teacherSessions = state.sessions.filter(
    (session) =>
      (session.teacherId ??
        state.courses.find((course) => course.id === session.courseId)?.teacherId) ===
      teacherId,
  );
  const notifications: AdminAnomaly[] = [];
  const nowKey = currentAcademicDateTimeKey();

  for (const session of teacherSessions) {
    const rate = session.expectedCount
      ? Math.round((session.presentCount / session.expectedCount) * 100)
      : 0;
    if (session.status === "ACTIVE") {
      const expired = academicDateTimeKey(session.date, session.endTime) <= nowKey;
      notifications.push({
        id: `active-${session.id}`,
        severity: expired || rate < 80 ? "HIGH" : "MEDIUM",
        title: expired ? "Clôture requise" : "Session en cours",
        detail: expired ? `${session.courseCode} a dépassé son heure de fin.` : `${session.courseCode} compte ${session.presentCount}/${session.expectedCount} pointages.`,
        href: `/teacher/sessions/${session.id}`,
      });
    }
    if (
      session.status === "SCHEDULED" &&
      session.date === currentAcademicDate() &&
      academicDateTimeKey(session.date, session.startTime) > nowKey
    ) {
      notifications.push({
        id: `scheduled-${session.id}`,
        severity: "LOW",
        title: "Séance prévue aujourd’hui",
        detail: `${session.courseCode} commence à ${session.startTime}.`,
        href: `/teacher/sessions/${session.id}`,
      });
    }
  }
  return notifications;
}

export function getTeacherStats(state: AcademicDataState, teacherId: string) {
  const sessions = state.sessions.filter(
    (session) =>
      (session.teacherId ??
        state.courses.find((course) => course.id === session.courseId)?.teacherId) ===
      teacherId &&
      session.status !== "CANCELLED",
  );
  const tracked = sessions.filter((session) => session.status === "COMPLETED");
  const expected = tracked.reduce((total, session) => total + session.expectedCount, 0);
  const present = tracked.reduce((total, session) => total + session.presentCount, 0);
  const late = state.attendances.filter(
    (record) =>
      record.status === "LATE" &&
      tracked.some((session) => session.id === record.sessionId),
  ).length;
  return {
    sessionsThisMonth: sessions.filter((session) => session.date.startsWith(academicMonth())).length,
    attendanceRate: expected ? Math.round((present / expected) * 100) : 0,
    trackedCount: tracked.length,
    lateCount: late,
    activeCount: sessions.filter((session) => session.status === "ACTIVE").length,
  };
}

export function createQrToken(sessionId: string, now = Date.now()) {
  const windowId = Math.floor(now / 30_000);
  let hash = 0;
  for (const character of `${sessionId}:${windowId}`) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return {
    value: `PP-${hash.toString(36).toUpperCase().padStart(7, "0")}`,
    expiresAt: (windowId + 1) * 30_000,
  };
}

export function isStoredAcademicData(value: unknown): value is AcademicDataState {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<AcademicDataState>;
  return data.version === 3 &&
    Array.isArray(data.users) &&
    Array.isArray(data.promotions) &&
    Array.isArray(data.courses) &&
    Array.isArray(data.sessions) &&
    Array.isArray(data.attendances) &&
    Array.isArray(data.correctionRequests);
}

export function migrateLegacyAdminData(value: unknown): AcademicDataState | null {
  if (!value || typeof value !== "object") return null;
  const legacy = value as Record<string, unknown>;
  if (
    legacy.version === 2 &&
    Array.isArray(legacy.users) &&
    Array.isArray(legacy.promotions) &&
    Array.isArray(legacy.courses) &&
    Array.isArray(legacy.sessions) &&
    Array.isArray(legacy.attendances)
  ) {
    return {
      ...(legacy as unknown as Omit<AcademicDataState, "version" | "correctionRequests">),
      version: 3,
      correctionRequests: [],
      auditLogs: [],
    };
  }
  if (
    legacy.version !== 1 ||
    !Array.isArray(legacy.users) ||
    !Array.isArray(legacy.promotions) ||
    !Array.isArray(legacy.courses) ||
    !Array.isArray(legacy.sessions) ||
    !Array.isArray(legacy.attendances)
  ) {
    return null;
  }
  const courses = legacy.courses as AcademicDataState["courses"];
  const users = legacy.users as AcademicDataState["users"];
  const promotions = legacy.promotions as AcademicDataState["promotions"];
  const sessions = (legacy.sessions as SessionSummary[]).map((session) => {
    const course = courses.find((item) => item.id === session.courseId);
    const teacher = users.find((item) => item.id === course?.teacherId);
    const promotion = promotions.find((item) => item.id === course?.promotionId);
    return {
      ...session,
      teacherId: course?.teacherId,
      promotionId: course?.promotionId,
      teacher: session.teacher || teacher?.name || "Enseignant",
      promotion: session.promotion || promotion?.name || "Promotion",
      lateThresholdMinutes: session.lateThresholdMinutes ?? 10,
      createdAt: session.createdAt ?? "2026-07-01T08:00:00.000Z",
    };
  });
  return {
    version: 3,
    users,
    promotions,
    courses,
    sessions,
    attendances: (legacy.attendances as AttendanceRecord[]).map((item) => ({
      ...item,
      source: item.source ?? "QR",
    })),
    correctionRequests: [],
    auditLogs: [],
  };
}
