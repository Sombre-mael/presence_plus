import type { AdminDataState, AdminUser } from "@/types/admin";
import type { AttendanceRecord, SessionSummary } from "@/types";

const createdAt = "2026-07-01T08:00:00.000Z";

const users: AdminUser[] = [
  { id: "u1", name: "Aline Kabeya", email: "aline@presence.plus", role: "ADMIN", status: "ACTIVE", createdAt },
  { id: "u2", name: "Patrick Ilunga", email: "patrick@presence.plus", role: "TEACHER", status: "ACTIVE", createdAt },
  { id: "u3", name: "Grâce Mulumba", email: "grace@presence.plus", role: "TEACHER", status: "ACTIVE", createdAt },
  { id: "u9", name: "Chantal Banza", email: "chantal@presence.plus", role: "TEACHER", status: "ACTIVE", createdAt },
  { id: "u4", name: "Sarah Mbuyi", email: "sarah@presence.plus", role: "STUDENT", status: "ACTIVE", promotionId: "p2", matricule: "INF22-041", createdAt },
  { id: "u5", name: "David Kalala", email: "david@presence.plus", role: "STUDENT", status: "ACTIVE", promotionId: "p2", matricule: "INF22-018", createdAt },
  { id: "u7", name: "Naomi Kanku", email: "naomi@presence.plus", role: "STUDENT", status: "ACTIVE", promotionId: "p2", matricule: "INF22-027", createdAt },
  { id: "u8", name: "Junior Mpoyi", email: "junior@presence.plus", role: "STUDENT", status: "ACTIVE", promotionId: "p2", matricule: "INF22-033", createdAt },
  { id: "u6", name: "Joël Tshibangu", email: "joel@presence.plus", role: "STUDENT", status: "INACTIVE", promotionId: "p4", matricule: "GES24-014", createdAt },
  { id: "u10", name: "Mireille Kasongo", email: "mireille@presence.plus", role: "STUDENT", status: "ACTIVE", promotionId: "p1", matricule: "INF25-011", createdAt },
];

const sessions: SessionSummary[] = [
  { id: "session-001", courseId: "c1", courseCode: "INF204", courseName: "Algorithmique avancée", teacher: "Patrick Ilunga", promotion: "L2 Informatique", date: "2026-07-25", startTime: "08:00", endTime: "10:00", room: "B12", status: "ACTIVE", presentCount: 36, expectedCount: 48 },
  { id: "session-002", courseId: "c2", courseCode: "INF210", courseName: "Bases de données", teacher: "Grâce Mulumba", promotion: "L2 Informatique", date: "2026-07-25", startTime: "10:30", endTime: "12:30", room: "Lab 2", status: "SCHEDULED", presentCount: 0, expectedCount: 48 },
  { id: "session-003", courseId: "c3", courseCode: "INF101", courseName: "Introduction à la programmation", teacher: "Patrick Ilunga", promotion: "L1 Informatique", date: "2026-07-24", startTime: "14:00", endTime: "16:00", room: "A04", status: "COMPLETED", presentCount: 57, expectedCount: 64 },
  { id: "session-004", courseId: "c1", courseCode: "INF204", courseName: "Algorithmique avancée", teacher: "Patrick Ilunga", promotion: "L2 Informatique", date: "2026-07-22", startTime: "08:00", endTime: "10:00", room: "B12", status: "COMPLETED", presentCount: 42, expectedCount: 48 },
  { id: "session-005", courseId: "c2", courseCode: "INF210", courseName: "Bases de données", teacher: "Grâce Mulumba", promotion: "L2 Informatique", date: "2026-07-18", startTime: "10:00", endTime: "12:00", room: "Lab 2", status: "COMPLETED", presentCount: 39, expectedCount: 48 },
  { id: "session-006", courseId: "c4", courseCode: "GES105", courseName: "Comptabilité générale", teacher: "Chantal Banza", promotion: "L1 Gestion", date: "2026-07-17", startTime: "08:00", endTime: "10:00", room: "A08", status: "COMPLETED", presentCount: 49, expectedCount: 57 },
  { id: "session-007", courseId: "c3", courseCode: "INF101", courseName: "Introduction à la programmation", teacher: "Patrick Ilunga", promotion: "L1 Informatique", date: "2026-07-15", startTime: "14:00", endTime: "16:00", room: "A04", status: "COMPLETED", presentCount: 54, expectedCount: 64 },
  { id: "session-008", courseId: "c1", courseCode: "INF204", courseName: "Algorithmique avancée", teacher: "Patrick Ilunga", promotion: "L2 Informatique", date: "2026-07-11", startTime: "08:00", endTime: "10:00", room: "B12", status: "COMPLETED", presentCount: 44, expectedCount: 48 },
  { id: "session-009", courseId: "c2", courseCode: "INF210", courseName: "Bases de données", teacher: "Grâce Mulumba", promotion: "L2 Informatique", date: "2026-07-08", startTime: "10:00", endTime: "12:00", room: "Lab 2", status: "COMPLETED", presentCount: 41, expectedCount: 48 },
  { id: "session-010", courseId: "c4", courseCode: "GES105", courseName: "Comptabilité générale", teacher: "Chantal Banza", promotion: "L1 Gestion", date: "2026-07-03", startTime: "08:00", endTime: "10:00", room: "A08", status: "COMPLETED", presentCount: 46, expectedCount: 57 },
  { id: "session-011", courseId: "c3", courseCode: "INF101", courseName: "Introduction à la programmation", teacher: "Patrick Ilunga", promotion: "L1 Informatique", date: "2026-06-26", startTime: "14:00", endTime: "16:00", room: "A04", status: "COMPLETED", presentCount: 52, expectedCount: 64 },
  { id: "session-012", courseId: "c1", courseCode: "INF204", courseName: "Algorithmique avancée", teacher: "Patrick Ilunga", promotion: "L2 Informatique", date: "2026-06-19", startTime: "08:00", endTime: "10:00", room: "B12", status: "COMPLETED", presentCount: 40, expectedCount: 48 },
];

const attendances: AttendanceRecord[] = [
  { id: "a1", sessionId: "session-001", studentId: "u4", studentName: "Sarah Mbuyi", matricule: "INF22-041", promotion: "L2 Informatique", checkedInAt: "08:02", status: "PRESENT" },
  { id: "a2", sessionId: "session-001", studentId: "u5", studentName: "David Kalala", matricule: "INF22-018", promotion: "L2 Informatique", checkedInAt: "08:14", status: "LATE" },
  { id: "a3", sessionId: "session-001", studentId: "u7", studentName: "Naomi Kanku", matricule: "INF22-027", promotion: "L2 Informatique", checkedInAt: "08:05", status: "PRESENT" },
  { id: "a4", sessionId: "session-001", studentId: "u8", studentName: "Junior Mpoyi", matricule: "INF22-033", checkedInAt: "08:07", status: "PRESENT", promotion: "L2 Informatique" },
  { id: "a5", sessionId: "session-003", studentId: "u10", studentName: "Mireille Kasongo", matricule: "INF25-011", promotion: "L1 Informatique", checkedInAt: "14:03", status: "PRESENT" },
  { id: "a6", sessionId: "session-004", studentId: "u4", studentName: "Sarah Mbuyi", matricule: "INF22-041", promotion: "L2 Informatique", checkedInAt: "08:11", status: "LATE" },
];

export const initialAdminData: AdminDataState = {
  version: 3,
  users,
  promotions: [
    { id: "p1", name: "L1 Informatique", department: "Sciences informatiques", academicYear: "2025-2026", createdAt },
    { id: "p2", name: "L2 Informatique", department: "Sciences informatiques", academicYear: "2025-2026", createdAt },
    { id: "p3", name: "L3 Informatique", department: "Sciences informatiques", academicYear: "2025-2026", createdAt },
    { id: "p4", name: "L1 Gestion", department: "Économie et gestion", academicYear: "2025-2026", createdAt },
  ],
  courses: [
    { id: "c1", code: "INF204", name: "Algorithmique avancée", teacherId: "u2", promotionId: "p2", weeklyHours: 4, createdAt },
    { id: "c2", code: "INF210", name: "Bases de données", teacherId: "u3", promotionId: "p2", weeklyHours: 4, createdAt },
    { id: "c3", code: "INF101", name: "Introduction à la programmation", teacherId: "u2", promotionId: "p1", weeklyHours: 6, createdAt },
    { id: "c4", code: "GES105", name: "Comptabilité générale", teacherId: "u9", promotionId: "p4", weeklyHours: 4, createdAt },
  ],
  sessions: sessions.map((session) => {
    const course = [
      { id: "c1", teacherId: "u2", promotionId: "p2" },
      { id: "c2", teacherId: "u3", promotionId: "p2" },
      { id: "c3", teacherId: "u2", promotionId: "p1" },
      { id: "c4", teacherId: "u9", promotionId: "p4" },
    ].find((item) => item.id === session.courseId);
    const expectedCount = users.filter((user) =>
      user.role === "STUDENT" &&
      user.status === "ACTIVE" &&
      user.promotionId === course?.promotionId).length;
    const presentCount = session.status === "SCHEDULED" || !session.expectedCount
      ? 0
      : Math.min(expectedCount, Math.round(session.presentCount / session.expectedCount * expectedCount));
    return {
      ...session,
      teacherId: course?.teacherId,
      promotionId: course?.promotionId,
      lateThresholdMinutes: 10,
      expectedCount,
      presentCount,
      createdAt,
      startedAt: session.status !== "SCHEDULED" ? `${session.date}T${session.startTime}:00.000Z` : undefined,
      completedAt: session.status === "COMPLETED" ? `${session.date}T${session.endTime}:00.000Z` : undefined,
    };
  }),
  attendances: [
    ...attendances.filter((attendance) => attendance.id !== "a1").map((attendance) => ({
      ...attendance,
      source: "QR" as const,
    })),
    ...sessions.flatMap((session) => {
      if (session.status !== "COMPLETED") return [];
      const course = [
        { id: "c1", promotionId: "p2" },
        { id: "c2", promotionId: "p2" },
        { id: "c3", promotionId: "p1" },
        { id: "c4", promotionId: "p4" },
      ].find((item) => item.id === session.courseId);
      const students = users.filter((user) =>
        user.role === "STUDENT" &&
        user.status === "ACTIVE" &&
        user.promotionId === course?.promotionId);
      const existing = attendances.filter((attendance) => attendance.sessionId === session.id);
      const targetPresent = session.expectedCount
        ? Math.round(session.presentCount / session.expectedCount * students.length)
        : 0;
      let remainingPresent = Math.max(0, targetPresent - existing.filter((item) => ["PRESENT", "LATE"].includes(item.status)).length);
      return students.filter((student) => !existing.some((item) => item.studentId === student.id)).map((student, index) => {
        const isPresent = remainingPresent-- > 0;
        return {
          id: `seed-${session.id}-${student.id}`,
          sessionId: session.id,
          studentId: student.id,
          studentName: student.name,
          matricule: student.matricule ?? "—",
          promotion: session.promotion,
          checkedInAt: isPresent ? session.startTime : undefined,
          status: isPresent ? "PRESENT" as const : "ABSENT" as const,
          source: "QR" as const,
          note: index === 0 ? "Donnée initiale." : undefined,
        };
      });
    }),
  ],
  correctionRequests: [],
  auditLogs: [],
};

export function freshAdminData(): AdminDataState {
  return structuredClone(initialAdminData);
}
