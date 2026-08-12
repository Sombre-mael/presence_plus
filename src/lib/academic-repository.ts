import "server-only";

import { prisma } from "@/lib/prisma";
import type { DemoViewer } from "@/lib/demo-viewer";
import type { AcademicDataState } from "@/types/admin";
import type { AttendanceStatus } from "@/types";
import type { Prisma } from "@/generated/prisma/client";
import { reconcileExpiredScheduledSessions } from "@/lib/session-maintenance";

export const ACADEMIC_TIME_ZONE = "Africa/Lubumbashi";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ACADEMIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: ACADEMIC_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function toAcademicDate(value: Date) {
  return dateFormatter.format(value);
}

export function toAcademicTime(value: Date) {
  return timeFormatter.format(value).replace(" h ", ":");
}

export function academicToday(now = new Date()) {
  return toAcademicDate(now);
}

export function fromAcademicDateTime(date: string, time: string) {
  const parsed = new Date(`${date}T${time}:00+02:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Date ou heure invalide.");
  return parsed;
}

function scopes(viewer: DemoViewer) {
  const isAdmin = viewer.role === "ADMIN";
  const isTeacher = viewer.role === "TEACHER";
  const promotionId = viewer.promotionId ?? "__none__";

  const users: Prisma.UserWhereInput | undefined = isAdmin
    ? undefined
    : isTeacher
      ? {
          OR: [
            { id: viewer.id },
            { role: "STUDENT", promotion: { courses: { some: { teacherId: viewer.id } } } },
            { role: "STUDENT", sessionEnrollments: { some: { session: { teacherId: viewer.id } } } },
            { role: "STUDENT", attendances: { some: { session: { teacherId: viewer.id } } } },
          ],
        }
      : { id: viewer.id };
  const promotions: Prisma.PromotionWhereInput | undefined = isAdmin
    ? undefined
    : isTeacher
      ? { courses: { some: { teacherId: viewer.id } } }
      : { id: promotionId };
  const courses: Prisma.CourseWhereInput | undefined = isAdmin
    ? undefined
    : isTeacher
      ? { teacherId: viewer.id }
      : { promotionId };
  const sessions: Prisma.SessionWhereInput | undefined = isAdmin
    ? undefined
    : isTeacher
      ? { teacherId: viewer.id }
      : {
          OR: [
            { promotionId },
            { enrollments: { some: { studentId: viewer.id } } },
            { attendances: { some: { studentId: viewer.id } } },
            { correctionRequests: { some: { studentId: viewer.id } } },
          ],
        };
  const attendances: Prisma.AttendanceWhereInput | undefined = isAdmin
    ? undefined
    : isTeacher
      ? { session: { teacherId: viewer.id } }
      : { studentId: viewer.id };
  const corrections: Prisma.AttendanceCorrectionRequestWhereInput | undefined = isAdmin
    ? undefined
    : isTeacher
      ? { teacherId: viewer.id }
      : { studentId: viewer.id };

  return { users, promotions, courses, sessions, attendances, corrections };
}

export async function getUsersForViewer(viewer: DemoViewer): Promise<AcademicDataState["users"]> {
  const users = await prisma.user.findMany({ where: scopes(viewer).users, orderBy: { createdAt: "asc" } });
  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    promotionId: user.promotionId ?? undefined,
    matricule: user.matricule ?? undefined,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }));
}

export async function getPromotionsForViewer(viewer: DemoViewer): Promise<AcademicDataState["promotions"]> {
  const promotions = await prisma.promotion.findMany({ where: scopes(viewer).promotions, orderBy: { createdAt: "asc" } });
  return promotions.map((promotion) => ({
    id: promotion.id,
    name: promotion.name,
    department: promotion.department,
    academicYear: promotion.academicYear,
    description: promotion.description ?? undefined,
    createdAt: promotion.createdAt.toISOString(),
    updatedAt: promotion.updatedAt.toISOString(),
  }));
}

export async function getCoursesForViewer(viewer: DemoViewer): Promise<AcademicDataState["courses"]> {
  const courses = await prisma.course.findMany({ where: scopes(viewer).courses, orderBy: { createdAt: "asc" } });
  return courses.map((course) => ({
    id: course.id,
    code: course.code,
    name: course.name,
    teacherId: course.teacherId,
    promotionId: course.promotionId,
    weeklyHours: course.weeklyHours,
    description: course.description ?? undefined,
    active: course.active,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
  }));
}

interface RepositoryPageOptions<TWhere> {
  where?: TWhere;
  skip?: number;
  take?: number;
}

function combineWhere<T>(scope: T | undefined, where: T | undefined): T | undefined {
  if (!scope) return where;
  if (!where) return scope;
  return { AND: [scope, where] } as T;
}

export async function getSessionsForViewer(
  viewer: DemoViewer,
  options: RepositoryPageOptions<Prisma.SessionWhereInput> = {},
): Promise<AcademicDataState["sessions"]> {
  const where = combineWhere(scopes(viewer).sessions, options.where);
  const sessions = await prisma.session.findMany({
    where,
    orderBy: { scheduledStartAt: "asc" },
    skip: options.skip,
    take: options.take,
    include: {
      courses: true,
      teacher: true,
      promotion: {
        include: {
          users: { where: { role: "STUDENT", status: "ACTIVE" }, select: { id: true } },
        },
      },
      attendances: { select: { status: true } },
      enrollments: { select: { studentId: true } },
    },
  });
  return sessions.map((session) => {
    const frozenRoster = ["ACTIVE", "COMPLETED"].includes(session.status);
    const enrolledStudentIds = frozenRoster
      ? session.enrollments.map((enrollment) => enrollment.studentId)
      : undefined;
    return {
    id: session.id,
    name: session.name,
    description: session.description ?? undefined,
    courseId: session.courseId,
    courseCode: session.courses.code,
    courseName: session.courses.name,
    teacher: session.teacher.name,
    teacherId: session.teacherId,
    promotion: session.promotion.name,
    promotionId: session.promotionId,
    date: toAcademicDate(session.scheduledStartAt),
    startTime: toAcademicTime(session.scheduledStartAt),
    endTime: toAcademicTime(session.scheduledEndAt),
    room: session.room,
    status: session.status,
    presentCount: session.attendances.filter((item) => ["PRESENT", "LATE"].includes(item.status)).length,
    expectedCount: enrolledStudentIds?.length ?? session.promotion.users.length,
    enrolledStudentIds,
    lateThresholdMinutes: session.lateThresholdMinutes,
    createdAt: session.createdAt.toISOString(),
    startedAt: session.startedAt?.toISOString(),
    completedAt: session.completedAt?.toISOString(),
    cancelledAt: session.cancelledAt?.toISOString(),
    cancellationReason: session.cancellationReason ?? undefined,
    };
  });
}

export async function countSessionsForViewer(viewer: DemoViewer, where?: Prisma.SessionWhereInput) {
  return prisma.session.count({ where: combineWhere(scopes(viewer).sessions, where) });
}

export async function getAttendancesForViewer(
  viewer: DemoViewer,
  options: RepositoryPageOptions<Prisma.AttendanceWhereInput> = {},
): Promise<AcademicDataState["attendances"]> {
  const where = combineWhere(scopes(viewer).attendances, options.where);
  const attendances = await prisma.attendance.findMany({
    where,
    orderBy: { createdAt: "asc" },
    skip: options.skip,
    take: options.take,
    include: {
      student: true,
      correctedBy: { select: { name: true } },
      session: { include: { promotion: true } },
    },
  });
  return attendances.map((attendance) => ({
    id: attendance.id,
    sessionId: attendance.sessionId,
    studentId: attendance.studentId,
    studentName: attendance.student.name,
    matricule: attendance.student.matricule ?? "-",
    promotion: attendance.session.promotion.name,
    checkedInAt: attendance.checkedInAt ? toAcademicTime(attendance.checkedInAt) : undefined,
    status: attendance.status,
    source: attendance.source,
    note: attendance.note ?? undefined,
    correctionReason: attendance.correctionReason ?? undefined,
    correctedAt: attendance.correctedAt?.toISOString(),
    correctedBy: attendance.correctedById ?? undefined,
    correctedByName: attendance.correctedBy?.name,
    createdAt: attendance.createdAt.toISOString(),
    updatedAt: attendance.updatedAt.toISOString(),
  }));
}

export async function countAttendancesForViewer(viewer: DemoViewer, where?: Prisma.AttendanceWhereInput) {
  return prisma.attendance.count({ where: combineWhere(scopes(viewer).attendances, where) });
}

export async function getCorrectionsForViewer(viewer: DemoViewer): Promise<AcademicDataState["correctionRequests"]> {
  const requests = await prisma.attendanceCorrectionRequest.findMany({
    where: scopes(viewer).corrections,
    orderBy: { createdAt: "asc" },
    include: { resolvedBy: { select: { name: true } } },
  });
  return requests.map((request) => ({
    id: request.id,
    sessionId: request.sessionId,
    attendanceId: request.attendanceId ?? undefined,
    studentId: request.studentId,
    teacherId: request.teacherId,
    requestedStatus: request.requestedStatus as Exclude<AttendanceStatus, "ABSENT">,
    reason: request.reason,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    decisionReason: request.decisionReason ?? undefined,
    resolvedStatus: request.resolvedStatus ?? undefined,
    resolvedBy: request.resolvedById ?? undefined,
    resolvedByName: request.resolvedBy?.name,
    resolvedAt: request.resolvedAt?.toISOString(),
  }));
}

export async function getAuditLogsForViewer(viewer: DemoViewer): Promise<AcademicDataState["auditLogs"]> {
  if (viewer.role !== "ADMIN") return [];
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { actor: { select: { name: true } } },
  });
  return logs.map((log) => ({
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
  }));
}

export type AcademicPatch = Partial<Omit<AcademicDataState, "version">>;
export type AcademicCollection = keyof AcademicPatch;

export async function getAcademicPatch(viewer: DemoViewer, keys: AcademicCollection[]): Promise<AcademicPatch> {
  if (keys.includes("sessions")) await reconcileExpiredScheduledSessions();
  const entries = await Promise.all(keys.map(async (key) => {
    if (key === "users") return [key, await getUsersForViewer(viewer)] as const;
    if (key === "promotions") return [key, await getPromotionsForViewer(viewer)] as const;
    if (key === "courses") return [key, await getCoursesForViewer(viewer)] as const;
    if (key === "sessions") return [key, await getSessionsForViewer(viewer)] as const;
    if (key === "attendances") return [key, await getAttendancesForViewer(viewer)] as const;
    if (key === "correctionRequests") return [key, await getCorrectionsForViewer(viewer)] as const;
    return [key, await getAuditLogsForViewer(viewer)] as const;
  }));
  return Object.fromEntries(entries) as AcademicPatch;
}

export async function getAcademicSnapshot(viewer: DemoViewer): Promise<AcademicDataState> {
  await reconcileExpiredScheduledSessions();
  const [users, promotions, courses, sessions, attendances, correctionRequests, auditLogs] = await Promise.all([
    getUsersForViewer(viewer),
    getPromotionsForViewer(viewer),
    getCoursesForViewer(viewer),
    getSessionsForViewer(viewer),
    getAttendancesForViewer(viewer),
    getCorrectionsForViewer(viewer),
    getAuditLogsForViewer(viewer),
  ]);
  return { version: 3, users, promotions, courses, sessions, attendances, correctionRequests, auditLogs };
}
