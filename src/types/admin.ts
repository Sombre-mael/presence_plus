import type {
  AdminLevel,
  AttendanceRecord,
  Role,
  SessionSummary,
  SessionStatus,
  UserStatus,
} from "@/types";
import type { AttendanceCorrectionRequest } from "@/types/student";
import type { AccountAccessState, AuthAccessCredential, AuthDeliveryStatus } from "@/types/auth";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  adminLevel?: AdminLevel;
  status: UserStatus;
  promotionId?: string;
  matricule?: string;
  activatedAt?: string;
  mustChangePassword?: boolean;
  lastLoginAt?: string;
  sessionVersion?: number;
  invitationPending?: boolean;
  accessState?: AccountAccessState;
  invitationExpiresAt?: string;
  deliveryStatus?: AuthDeliveryStatus;
  activeSessionCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminPromotion {
  id: string;
  name: string;
  department: string;
  academicYear: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminCourse {
  id: string;
  code: string;
  name: string;
  teacherId: string;
  promotionId: string;
  weeklyHours: number;
  description?: string;
  active?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminAuditLog {
  id: string;
  actorId: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SystemAdminSummary {
  id: string;
  name: string;
  email: string;
  adminLevel: AdminLevel;
  status: UserStatus;
  activeSessionCount: number;
  lastLoginAt?: string;
}

export interface SystemAdministrationData {
  admins: SystemAdminSummary[];
  profilePhotoEnforcementAt: string;
}

export interface AcademicDataState {
  version: 3;
  users: AdminUser[];
  promotions: AdminPromotion[];
  courses: AdminCourse[];
  sessions: SessionSummary[];
  attendances: AttendanceRecord[];
  correctionRequests: AttendanceCorrectionRequest[];
  auditLogs: AdminAuditLog[];
}

export type AdminDataState = AcademicDataState;

export type AdminUserInput = Pick<AdminUser, "name" | "email" | "role" | "status" | "promotionId" | "matricule"> & {
  currentPassword?: string;
};
export type UserAccessMutationValue = Partial<AuthAccessCredential> & { id?: string };
export type AdminPromotionInput = Omit<AdminPromotion, "id" | "createdAt" | "updatedAt">;
export type AdminCourseInput = Omit<AdminCourse, "id" | "createdAt" | "updatedAt">;

export interface MutationResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface TeacherSessionInput {
  name?: string;
  description?: string;
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

export type StatisticsPeriod = "7D" | "30D" | "180D";

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
