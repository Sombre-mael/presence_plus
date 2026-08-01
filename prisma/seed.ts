import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import {
  AttendanceSource,
  AttendanceStatus,
  Role,
  SessionStatus,
  UserStatus,
} from "../src/generated/prisma/enums";

const demoPassword = process.env.SEED_PASSWORD ?? "PresencePlus2026!";
const now = new Date();

function minutesFrom(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function dayAt(dayOffset: number, hour: number, minute = 0) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

async function main() {
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  const promotions = [
    { id: "p1", name: "L1 Informatique", department: "Sciences informatiques", academicYear: "2025-2026" },
    { id: "p2", name: "L2 Informatique", department: "Sciences informatiques", academicYear: "2025-2026" },
    { id: "p3", name: "L3 Informatique", department: "Sciences informatiques", academicYear: "2025-2026" },
    { id: "p4", name: "L1 Gestion", department: "Économie et gestion", academicYear: "2025-2026" },
  ];

  for (const promotion of promotions) {
    await prisma.promotion.upsert({
      where: { id: promotion.id },
      update: promotion,
      create: promotion,
    });
  }

  const users = [
    { id: "u1", name: "Aline Kabeya", email: "aline@presence.plus", role: Role.ADMIN, status: UserStatus.ACTIVE, matricule: null, promotionId: null },
    { id: "u2", name: "Patrick Ilunga", email: "patrick@presence.plus", role: Role.TEACHER, status: UserStatus.ACTIVE, matricule: null, promotionId: null },
    { id: "u3", name: "Grâce Mulumba", email: "grace@presence.plus", role: Role.TEACHER, status: UserStatus.ACTIVE, matricule: null, promotionId: null },
    { id: "u9", name: "Chantal Banza", email: "chantal@presence.plus", role: Role.TEACHER, status: UserStatus.ACTIVE, matricule: null, promotionId: null },
    { id: "u4", name: "Sarah Mbuyi", email: "sarah@presence.plus", role: Role.STUDENT, status: UserStatus.ACTIVE, matricule: "INF22-041", promotionId: "p2" },
    { id: "u5", name: "David Kalala", email: "david@presence.plus", role: Role.STUDENT, status: UserStatus.ACTIVE, matricule: "INF22-018", promotionId: "p2" },
    { id: "u7", name: "Naomi Kanku", email: "naomi@presence.plus", role: Role.STUDENT, status: UserStatus.ACTIVE, matricule: "INF22-027", promotionId: "p2" },
    { id: "u8", name: "Junior Mpoyi", email: "junior@presence.plus", role: Role.STUDENT, status: UserStatus.ACTIVE, matricule: "INF22-033", promotionId: "p2" },
    { id: "u6", name: "Joël Tshibangu", email: "joel@presence.plus", role: Role.STUDENT, status: UserStatus.INACTIVE, matricule: "GES24-014", promotionId: "p4" },
    { id: "u10", name: "Mireille Kasongo", email: "mireille@presence.plus", role: Role.STUDENT, status: UserStatus.ACTIVE, matricule: "INF25-011", promotionId: "p1" },
  ];

  for (const user of users) {
    const common = {
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      matricule: user.matricule,
      passwordHash,
    };
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        ...common,
        promotion: user.promotionId
          ? { connect: { id: user.promotionId } }
          : { disconnect: true },
      },
      create: {
        id: user.id,
        ...common,
        ...(user.promotionId
          ? { promotion: { connect: { id: user.promotionId } } }
          : {}),
      },
    });
  }

  const courses = [
    { id: "c1", code: "INF204", name: "Algorithmique avancée", weeklyHours: 4, teacherId: "u2", promotionId: "p2" },
    { id: "c2", code: "INF210", name: "Bases de données", weeklyHours: 4, teacherId: "u3", promotionId: "p2" },
    { id: "c3", code: "INF101", name: "Introduction à la programmation", weeklyHours: 6, teacherId: "u2", promotionId: "p1" },
    { id: "c4", code: "GES105", name: "Comptabilité générale", weeklyHours: 4, teacherId: "u9", promotionId: "p4" },
  ];

  for (const course of courses) {
    const data = {
      code: course.code,
      name: course.name,
      weeklyHours: course.weeklyHours,
      active: true,
      teacher: { connect: { id: course.teacherId } },
      promotion: { connect: { id: course.promotionId } },
    };
    await prisma.course.upsert({
      where: { id: course.id },
      update: data,
      create: { id: course.id, ...data },
    });
  }

  const activeStart = minutesFrom(now, -30);
  const sessions = [
    { id: "session-001", name: "Algorithmique - séance active", courseId: "c1", teacherId: "u2", promotionId: "p2", room: "B12", status: SessionStatus.ACTIVE, start: activeStart, end: minutesFrom(activeStart, 120), startedAt: activeStart },
    { id: "session-002", name: "Bases de données - prochaine séance", courseId: "c2", teacherId: "u3", promotionId: "p2", room: "Lab 2", status: SessionStatus.SCHEDULED, start: dayAt(1, 10, 30), end: dayAt(1, 12, 30), startedAt: null },
    { id: "session-003", name: "Introduction à la programmation", courseId: "c3", teacherId: "u2", promotionId: "p1", room: "A04", status: SessionStatus.COMPLETED, start: dayAt(-1, 14), end: dayAt(-1, 16), startedAt: dayAt(-1, 14) },
    { id: "session-004", name: "Algorithmique - exercices", courseId: "c1", teacherId: "u2", promotionId: "p2", room: "B12", status: SessionStatus.COMPLETED, start: dayAt(-3, 8), end: dayAt(-3, 10), startedAt: dayAt(-3, 8) },
    { id: "session-005", name: "Bases de données - modélisation", courseId: "c2", teacherId: "u3", promotionId: "p2", room: "Lab 2", status: SessionStatus.COMPLETED, start: dayAt(-7, 10), end: dayAt(-7, 12), startedAt: dayAt(-7, 10) },
    { id: "session-006", name: "Comptabilité générale", courseId: "c4", teacherId: "u9", promotionId: "p4", room: "A08", status: SessionStatus.CANCELLED, start: dayAt(2, 8), end: dayAt(2, 10), startedAt: null },
  ];

  for (const session of sessions) {
    const completedAt = session.status === SessionStatus.COMPLETED ? session.end : null;
    const cancelledAt = session.status === SessionStatus.CANCELLED ? now : null;
    const data = {
      name: session.name,
      scheduledStartAt: session.start,
      scheduledEndAt: session.end,
      room: session.room,
      lateThresholdMinutes: 10,
      status: session.status,
      startedAt: session.startedAt,
      completedAt,
      cancelledAt,
      cancellationReason: session.status === SessionStatus.CANCELLED
        ? "Indisponibilité de la salle."
        : null,
      courses: { connect: { id: session.courseId } },
      teacher: { connect: { id: session.teacherId } },
      promotion: { connect: { id: session.promotionId } },
    };
    await prisma.session.upsert({
      where: { id: session.id },
      update: data,
      create: { id: session.id, ...data },
    });
  }

  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const attendanceRows = [
    { id: "a2", sessionId: "session-001", studentId: "u5", status: AttendanceStatus.PRESENT, source: AttendanceSource.QR, minutes: 8, note: null },
    { id: "a3", sessionId: "session-001", studentId: "u7", status: AttendanceStatus.LATE, source: AttendanceSource.QR, minutes: 15, note: null },
    { id: "a4", sessionId: "session-001", studentId: "u8", status: AttendanceStatus.PRESENT, source: AttendanceSource.STUDENT_CODE, minutes: 4, note: null },
    { id: "a5", sessionId: "session-003", studentId: "u10", status: AttendanceStatus.PRESENT, source: AttendanceSource.QR, minutes: 3, note: null },
    { id: "a6", sessionId: "session-004", studentId: "u4", status: AttendanceStatus.LATE, source: AttendanceSource.QR, minutes: 12, note: null },
    { id: "a7", sessionId: "session-004", studentId: "u5", status: AttendanceStatus.PRESENT, source: AttendanceSource.QR, minutes: 5, note: null },
    { id: "a8", sessionId: "session-004", studentId: "u7", status: AttendanceStatus.ABSENT, source: AttendanceSource.MANUAL, minutes: null, note: "Absence constatée à la clôture." },
    { id: "a9", sessionId: "session-004", studentId: "u8", status: AttendanceStatus.EXCUSED, source: AttendanceSource.MANUAL, minutes: null, note: "Absence justifiée." },
    { id: "a10", sessionId: "session-005", studentId: "u4", status: AttendanceStatus.PRESENT, source: AttendanceSource.STUDENT_CODE, minutes: 2, note: null },
    { id: "a11", sessionId: "session-005", studentId: "u5", status: AttendanceStatus.LATE, source: AttendanceSource.QR, minutes: 18, note: null },
    { id: "a12", sessionId: "session-005", studentId: "u7", status: AttendanceStatus.PRESENT, source: AttendanceSource.QR, minutes: 6, note: null },
    { id: "a13", sessionId: "session-005", studentId: "u8", status: AttendanceStatus.ABSENT, source: AttendanceSource.MANUAL, minutes: null, note: "Absence constatée à la clôture." },
  ];

  for (const attendance of attendanceRows) {
    const session = sessionById.get(attendance.sessionId);
    if (!session) throw new Error(`Session de seed introuvable: ${attendance.sessionId}`);
    const checkedInAt = attendance.minutes === null
      ? null
      : minutesFrom(session.start, attendance.minutes);
    const data = {
      status: attendance.status,
      source: attendance.source,
      checkedInAt,
      note: attendance.note,
    };
    await prisma.attendance.upsert({
      where: {
        studentId_sessionId: {
          studentId: attendance.studentId,
          sessionId: attendance.sessionId,
        },
      },
      update: data,
      create: {
        id: attendance.id,
        ...data,
        student: { connect: { id: attendance.studentId } },
        session: { connect: { id: attendance.sessionId } },
      },
    });
  }

  await prisma.auditLog.upsert({
    where: { id: "seed-academic-v3" },
    update: {
      metadata: { users: users.length, courses: courses.length, sessions: sessions.length },
    },
    create: {
      id: "seed-academic-v3",
      actorId: "u1",
      action: "SEED_ACADEMIC_DATA",
      entityType: "DATABASE",
      entityId: "presence_plus",
      metadata: { users: users.length, courses: courses.length, sessions: sessions.length },
    },
  });

  console.log("Seed Presence Plus terminé.", {
    users: users.length,
    promotions: promotions.length,
    courses: courses.length,
    sessions: sessions.length,
    attendances: attendanceRows.length,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
