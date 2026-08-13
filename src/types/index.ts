export type Role = "ADMIN" | "TEACHER" | "STUDENT";

export type UserStatus = "ACTIVE" | "INACTIVE";
export type SessionStatus = "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
export type AttendanceSource = "QR" | "STUDENT_CODE" | "MANUAL";

export interface UserSummary {
  id: string;
  name: string;
  email?: string;
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
  name?: string;
  description?: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  teacher: string;
  teacherId?: string;
  promotion: string;
  promotionId?: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  status: SessionStatus;
  presentCount: number;
  expectedCount: number;
  lateThresholdMinutes?: number;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  enrolledStudentIds?: string[];
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
  source?: AttendanceSource;
  note?: string;
  correctionReason?: string;
  correctedAt?: string;
  correctedBy?: string;
  correctedByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardStat {
  label: string;
  value: string;
  detail: string;
  trend?: string;
}
