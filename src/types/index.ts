export type Role = "ADMIN" | "TEACHER" | "STUDENT";

export type UserStatus = "ACTIVE" | "INACTIVE";
export type SessionStatus = "SCHEDULED" | "ACTIVE" | "COMPLETED";
export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  promotion?: string;
}

export interface Promotion {
  id: string;
  name: string;
  department: string;
  studentCount: number;
  courseCount: number;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  teacher: string;
  promotion: string;
  weeklyHours: number;
}

export interface SessionSummary {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  teacher: string;
  promotion: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  status: SessionStatus;
  presentCount: number;
  expectedCount: number;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  matricule: string;
  promotion: string;
  checkedInAt?: string;
  status: AttendanceStatus;
}

export interface DashboardStat {
  label: string;
  value: string;
  detail: string;
  trend?: string;
}
