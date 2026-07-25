import type {
  AttendanceRecord,
  Course,
  DashboardStat,
  Promotion,
  SessionSummary,
  UserSummary,
} from "@/types";

export const demoUsers: UserSummary[] = [
  { id: "u1", name: "Aline Kabeya", email: "aline@presence.plus", role: "ADMIN", status: "ACTIVE" },
  { id: "u2", name: "Patrick Ilunga", email: "patrick@presence.plus", role: "TEACHER", status: "ACTIVE" },
  { id: "u3", name: "Grâce Mulumba", email: "grace@presence.plus", role: "TEACHER", status: "ACTIVE" },
  { id: "u4", name: "Sarah Mbuyi", email: "sarah@presence.plus", role: "STUDENT", status: "ACTIVE", promotion: "L2 Informatique" },
  { id: "u5", name: "David Kalala", email: "david@presence.plus", role: "STUDENT", status: "ACTIVE", promotion: "L2 Informatique" },
  { id: "u6", name: "Joël Tshibangu", email: "joel@presence.plus", role: "STUDENT", status: "INACTIVE", promotion: "L1 Gestion" },
];

export const promotions: Promotion[] = [
  { id: "p1", name: "L1 Informatique", department: "Sciences informatiques", studentCount: 64, courseCount: 9 },
  { id: "p2", name: "L2 Informatique", department: "Sciences informatiques", studentCount: 48, courseCount: 8 },
  { id: "p3", name: "L3 Informatique", department: "Sciences informatiques", studentCount: 39, courseCount: 7 },
  { id: "p4", name: "L1 Gestion", department: "Économie et gestion", studentCount: 57, courseCount: 10 },
];

export const courses: Course[] = [
  { id: "c1", code: "INF204", name: "Algorithmique avancée", teacher: "Patrick Ilunga", promotion: "L2 Informatique", weeklyHours: 4 },
  { id: "c2", code: "INF210", name: "Bases de données", teacher: "Grâce Mulumba", promotion: "L2 Informatique", weeklyHours: 4 },
  { id: "c3", code: "INF101", name: "Introduction à la programmation", teacher: "Patrick Ilunga", promotion: "L1 Informatique", weeklyHours: 6 },
  { id: "c4", code: "GES105", name: "Comptabilité générale", teacher: "Chantal Banza", promotion: "L1 Gestion", weeklyHours: 4 },
];

export const sessions: SessionSummary[] = [
  { id: "session-001", courseId: "c1", courseCode: "INF204", courseName: "Algorithmique avancée", teacher: "Patrick Ilunga", promotion: "L2 Informatique", date: "2026-07-25", startTime: "08:00", endTime: "10:00", room: "B12", status: "ACTIVE", presentCount: 36, expectedCount: 48 },
  { id: "session-002", courseId: "c2", courseCode: "INF210", courseName: "Bases de données", teacher: "Grâce Mulumba", promotion: "L2 Informatique", date: "2026-07-25", startTime: "10:30", endTime: "12:30", room: "Lab 2", status: "SCHEDULED", presentCount: 0, expectedCount: 48 },
  { id: "session-003", courseId: "c3", courseCode: "INF101", courseName: "Introduction à la programmation", teacher: "Patrick Ilunga", promotion: "L1 Informatique", date: "2026-07-24", startTime: "14:00", endTime: "16:00", room: "A04", status: "COMPLETED", presentCount: 57, expectedCount: 64 },
  { id: "session-004", courseId: "c1", courseCode: "INF204", courseName: "Algorithmique avancée", teacher: "Patrick Ilunga", promotion: "L2 Informatique", date: "2026-07-22", startTime: "08:00", endTime: "10:00", room: "B12", status: "COMPLETED", presentCount: 42, expectedCount: 48 },
];

export const attendances: AttendanceRecord[] = [
  { id: "a1", sessionId: "session-001", studentId: "u4", studentName: "Sarah Mbuyi", matricule: "INF22-041", promotion: "L2 Informatique", checkedInAt: "08:02", status: "PRESENT" },
  { id: "a2", sessionId: "session-001", studentId: "u5", studentName: "David Kalala", matricule: "INF22-018", promotion: "L2 Informatique", checkedInAt: "08:14", status: "LATE" },
  { id: "a3", sessionId: "session-001", studentId: "u7", studentName: "Naomi Kanku", matricule: "INF22-027", promotion: "L2 Informatique", checkedInAt: "08:05", status: "PRESENT" },
  { id: "a4", sessionId: "session-001", studentId: "u8", studentName: "Junior Mpoyi", matricule: "INF22-033", promotion: "L2 Informatique", status: "ABSENT" },
  { id: "a5", sessionId: "session-003", studentId: "u4", studentName: "Sarah Mbuyi", matricule: "INF22-041", promotion: "L2 Informatique", checkedInAt: "14:03", status: "PRESENT" },
  { id: "a6", sessionId: "session-004", studentId: "u4", studentName: "Sarah Mbuyi", matricule: "INF22-041", promotion: "L2 Informatique", checkedInAt: "08:11", status: "LATE" },
];

export const adminStats: DashboardStat[] = [
  { label: "Utilisateurs actifs", value: "206", detail: "sur 211 comptes", trend: "+12 ce mois" },
  { label: "Présence moyenne", value: "87%", detail: "30 derniers jours", trend: "+3,4%" },
  { label: "Sessions aujourd’hui", value: "8", detail: "3 encore actives" },
  { label: "Promotions", value: "4", detail: "208 étudiants" },
];

export const teacherStats: DashboardStat[] = [
  { label: "Sessions ce mois", value: "18", detail: "36 heures enseignées" },
  { label: "Présence moyenne", value: "89%", detail: "sur vos cours", trend: "+2,1%" },
  { label: "Session active", value: "1", detail: "Algorithmique avancée" },
];

export const studentStats: DashboardStat[] = [
  { label: "Taux de présence", value: "92%", detail: "depuis le début du semestre", trend: "+1,8%" },
  { label: "Cours suivis", value: "8", detail: "L2 Informatique" },
  { label: "Retards", value: "2", detail: "sur 34 séances" },
];

export const demoAccounts = {
  ADMIN: demoUsers[0],
  TEACHER: demoUsers[1],
  STUDENT: demoUsers[3],
} as const;

export function getSession(id: string) {
  return sessions.find((session) => session.id === id);
}

export function getSessionAttendances(id: string) {
  return attendances.filter((attendance) => attendance.sessionId === id);
}
