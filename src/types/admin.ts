import type {
  AttendanceRecord,
  Role,
  SessionSummary,
  SessionStatus,
  UserStatus,
} from "@/types";
import type { AttendanceCorrectionRequest } from "@/types/student";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  promotionId?: string;
  matricule?: string;
  createdAt: string;
}

export interface AdminPromotion {
  id: string;
  name: string;
  department: string;
  academicYear: string;
  createdAt: string;
}

export interface AdminCourse {
  id: string;
  code: string;
  name: string;
  teacherId: string;
  promotionId: string;
  weeklyHours: number;
  createdAt: string;
}

export interface AcademicDataState {
  version: 3;
  users: AdminUser[];
  promotions: AdminPromotion[];
  courses: AdminCourse[];
  sessions: SessionSummary[];
  attendances: AttendanceRecord[];
  correctionRequests: AttendanceCorrectionRequest[];
}

export type AdminDataState = AcademicDataState;

export type AdminUserInput = Omit<AdminUser, "id" | "createdAt">;
export type AdminPromotionInput = Omit<AdminPromotion, "id" | "createdAt">;
export type AdminCourseInput = Omit<AdminCourse, "id" | "createdAt">;

export interface MutationResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface TeacherSessionInput {
  courseId: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  lateThresholdMinutes: number;
}

export interface AttendanceInput {
  studentId: string;
  status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
  checkedInAt?: string;
  source: "QR" | "MANUAL";
  note?: string;
  correctionReason?: string;
}

export interface AdminDashboardStats {
  activeUsers: number;
  totalUsers: number;
  attendanceRate: number;
  sessionsToday: number;
  activeSessions: number;
  promotionCount: number;
  studentCount: number;
}

export type AnomalySeverity = "HIGH" | "MEDIUM" | "LOW";

export interface AdminAnomaly {
  id: string;
  severity: AnomalySeverity;
  title: string;
  detail: string;
  href: string;
}

export interface SessionFilters {
  query: string;
  status: SessionStatus | "ALL";
  promotionId: string;
  courseId: string;
  teacherId: string;
  date: string;
}

export type StatisticsPeriod = "7D" | "30D" | "SEMESTER";

export interface StatisticsFilters {
  period: StatisticsPeriod;
  promotionId: string;
  courseId: string;
}

export interface AttendanceTrendPoint {
  label: string;
  date: string;
  present: number;
  late: number;
  absent: number;
  rate: number;
}
