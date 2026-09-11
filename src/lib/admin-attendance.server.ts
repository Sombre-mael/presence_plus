import "server-only";

import { prisma } from "@/lib/prisma";
import { getAttendancePolicy } from "@/lib/attendance-policy.server";
import { fromAcademicDateTime, toAcademicDate } from "@/lib/academic-repository";
import { addAcademicDays, currentAcademicDate } from "@/lib/academic-calendar";
import type { Prisma } from "@/generated/prisma/client";
import type { AdminAssiduityFilters, AdminAssiduityPage, AdminAssiduityRow, AdminCorrectionFilters, AdminCorrectionPage } from "@/types/admin-attendance";

const PAGE_SIZE = 25;

async function filterOptions() {
  const [promotions, courses, teachers] = await Promise.all([
    prisma.promotion.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.course.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.user.findMany({ where: { role: "TEACHER" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { promotions, courses, teachers };
}

export async function getAdminAssiduityPage(filters: AdminAssiduityFilters): Promise<AdminAssiduityPage> {
  const page = Math.max(1, Math.trunc(filters.page ?? 1));
  const pageSize = Math.min(10_000, Math.max(10, Math.trunc(filters.pageSize ?? PAGE_SIZE)));
  const period = filters.period ?? "30";
  const startDate = period === "ALL" ? undefined : fromAcademicDateTime(addAcademicDays(currentAcademicDate(), 1 - Number(period)), "00:00");
  const where: Prisma.SessionWhereInput = {
    status: "COMPLETED",
    ...(startDate ? { scheduledStartAt: { gte: startDate } } : {}),
    ...(filters.promotionId ? { promotionId: filters.promotionId } : {}),
    ...(filters.courseId ? { courseId: filters.courseId } : {}),
    ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
  };
  const [sessions, activeCourses, policy, options] = await Promise.all([
    prisma.session.findMany({
      where,
      orderBy: { scheduledStartAt: "desc" },
      select: {
        id: true,
        courseId: true,
        teacherId: true,
        promotionId: true,
        courses: { select: { code: true, name: true } },
        teacher: { select: { name: true } },
        promotion: { select: { name: true } },
        enrollments: { select: { student: { select: { id: true, name: true, matricule: true } } } },
        attendances: { select: { studentId: true, status: true, student: { select: { id: true, name: true, matricule: true } } } },
      },
    }),
    prisma.course.findMany({
      where: { active: true, promotion: { archivedAt: null }, ...(filters.promotionId ? { promotionId: filters.promotionId } : {}), ...(filters.courseId ? { id: filters.courseId } : {}), ...(filters.teacherId ? { teacherId: filters.teacherId } : {}) },
      select: { id: true, code: true, name: true, teacherId: true, teacher: { select: { name: true } }, promotionId: true, promotion: { select: { name: true, users: { where: { role: "STUDENT", status: "ACTIVE" }, select: { id: true, name: true, matricule: true } } } } },
    }),
    getAttendancePolicy(),
    filterOptions(),
  ]);

  type MutableRow = Omit<AdminAssiduityRow, "attendanceRate" | "punctualityRate" | "situation">;
  const rows = new Map<string, MutableRow>();
  function ensureRow(course: typeof activeCourses[number], student: { id: string; name: string; matricule: string | null }) {
    const key = `${course.id}:${student.id}`;
    if (!rows.has(key)) rows.set(key, { key, studentId: student.id, studentName: student.name, matricule: student.matricule ?? "—", promotionId: course.promotionId, promotionName: course.promotion.name, courseId: course.id, courseCode: course.code, courseName: course.name, teacherId: course.teacherId, teacherName: course.teacher.name, sessionCount: 0, present: 0, late: 0, absent: 0, excused: 0, missing: 0 });
    return rows.get(key)!;
  }
  for (const course of activeCourses) for (const student of course.promotion.users) ensureRow(course, student);
  for (const session of sessions) {
    const course = { id: session.courseId, code: session.courses.code, name: session.courses.name, teacherId: session.teacherId, teacher: session.teacher, promotionId: session.promotionId, promotion: { name: session.promotion.name, users: [] } };
    const attendanceByStudent = new Map(session.attendances.map((record) => [record.studentId, record]));
    const students = new Map(session.enrollments.map((entry) => [entry.student.id, entry.student]));
    for (const record of session.attendances) students.set(record.student.id, record.student);
    for (const student of students.values()) {
      const row = ensureRow(course, student);
      row.sessionCount += 1;
      const status = attendanceByStudent.get(student.id)?.status;
      if (status === "PRESENT") row.present += 1;
      else if (status === "LATE") row.late += 1;
      else if (status === "ABSENT") row.absent += 1;
      else if (status === "EXCUSED") row.excused += 1;
      else row.missing += 1;
    }
  }
  const query = filters.query?.trim().toLocaleLowerCase("fr") ?? "";
  const completeRows: AdminAssiduityRow[] = [...rows.values()].map((row) => {
    const eligible = row.present + row.late + row.absent;
    const attended = row.present + row.late;
    const attendanceRate = eligible ? Math.round(100 * attended / eligible) : null;
    const punctualityRate = attended ? Math.round(100 * row.present / attended) : null;
    const situation: AdminAssiduityRow["situation"] = attendanceRate === null ? "NO_DATA" : attendanceRate < policy.attendanceAlertThreshold ? "ATTENTION" : "REGULAR";
    return { ...row, attendanceRate, punctualityRate, situation };
  }).filter((row) => (!query || `${row.studentName} ${row.matricule}`.toLocaleLowerCase("fr").includes(query)) && (!filters.situation || filters.situation === "ALL" || (filters.situation === "MISSING" ? row.missing > 0 : row.situation === filters.situation)));
  completeRows.sort((a, b) => Number(b.situation === "ATTENTION") - Number(a.situation === "ATTENTION") || a.studentName.localeCompare(b.studentName, "fr"));
  const eligible = completeRows.reduce((sum, row) => sum + row.present + row.late + row.absent, 0);
  const attended = completeRows.reduce((sum, row) => sum + row.present + row.late, 0);
  return {
    items: completeRows.slice((page - 1) * pageSize, page * pageSize), total: completeRows.length, page, pageSize, threshold: policy.attendanceAlertThreshold,
    summary: { students: new Set(completeRows.map((row) => row.studentId)).size, attendanceRate: eligible ? Math.round(100 * attended / eligible) : null, attentionCount: completeRows.filter((row) => row.situation === "ATTENTION").length, missingCount: completeRows.reduce((sum, row) => sum + row.missing, 0) },
    options,
  };
}

export async function getAdminCorrectionPage(filters: AdminCorrectionFilters): Promise<AdminCorrectionPage> {
  const page = Math.max(1, Math.trunc(filters.page ?? 1));
  const query = filters.query?.trim();
  const where: Prisma.AttendanceCorrectionRequestWhereInput = {
    ...(filters.status && filters.status !== "ALL" ? { status: filters.status } : {}),
    ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
    ...((filters.promotionId || filters.courseId) ? { session: { ...(filters.promotionId ? { promotionId: filters.promotionId } : {}), ...(filters.courseId ? { courseId: filters.courseId } : {}) } } : {}),
    ...(query ? { student: { OR: [{ name: { contains: query, mode: "insensitive" } }, { matricule: { contains: query, mode: "insensitive" } }] } } : {}),
  };
  const [items, total, grouped, options] = await Promise.all([
    prisma.attendanceCorrectionRequest.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { student: { select: { name: true, matricule: true } }, teacher: { select: { name: true } }, session: { include: { courses: true, promotion: true } } } }),
    prisma.attendanceCorrectionRequest.count({ where }),
    prisma.attendanceCorrectionRequest.groupBy({ by: ["status"], _count: true }),
    filterOptions(),
  ]);
  const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 };
  for (const item of grouped) counts[item.status] = item._count;
  return { page, pageSize: PAGE_SIZE, total, counts, options, items: items.map((item) => ({ id: item.id, status: item.status, requestedStatus: item.requestedStatus, resolvedStatus: item.resolvedStatus ?? undefined, reason: item.reason, decisionReason: item.decisionReason ?? undefined, createdAt: item.createdAt.toISOString(), resolvedAt: item.resolvedAt?.toISOString(), studentId: item.studentId, studentName: item.student.name, matricule: item.student.matricule ?? "—", teacherId: item.teacherId, teacherName: item.teacher.name, sessionId: item.sessionId, sessionName: item.session.name, sessionDate: toAcademicDate(item.session.scheduledStartAt), courseId: item.session.courseId, courseCode: item.session.courses.code, courseName: item.session.courses.name, promotionId: item.session.promotionId, promotionName: item.session.promotion.name })) };
}
