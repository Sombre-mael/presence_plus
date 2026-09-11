import type { AttendanceStatus } from "@/types";
import type { CorrectionRequestStatus } from "@/types/student";

export type AdminAssiduitySituation = "ALL" | "REGULAR" | "ATTENTION" | "NO_DATA" | "MISSING";

export interface AdminAssiduityFilters {
  query?: string;
  promotionId?: string;
  courseId?: string;
  teacherId?: string;
  period?: "30" | "90" | "180" | "ALL";
  situation?: AdminAssiduitySituation;
  page?: number;
  pageSize?: number;
}

export interface AdminAssiduityRow {
  key: string;
  studentId: string;
  studentName: string;
  matricule: string;
  promotionId: string;
  promotionName: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  teacherId: string;
  teacherName: string;
  sessionCount: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  missing: number;
  attendanceRate: number | null;
  punctualityRate: number | null;
  situation: Exclude<AdminAssiduitySituation, "ALL" | "MISSING">;
}

export interface AdminAssiduityPage {
  items: AdminAssiduityRow[];
  total: number;
  page: number;
  pageSize: number;
  threshold: number;
  summary: { students: number; attendanceRate: number | null; attentionCount: number; missingCount: number };
  options: {
    promotions: { id: string; name: string }[];
    courses: { id: string; code: string; name: string }[];
    teachers: { id: string; name: string }[];
  };
}

export interface AdminCorrectionFilters {
  query?: string;
  status?: CorrectionRequestStatus | "ALL";
  promotionId?: string;
  courseId?: string;
  teacherId?: string;
  page?: number;
}

export interface AdminCorrectionRow {
  id: string;
  status: CorrectionRequestStatus;
  requestedStatus: AttendanceStatus;
  resolvedStatus?: AttendanceStatus;
  reason: string;
  decisionReason?: string;
  createdAt: string;
  resolvedAt?: string;
  studentId: string;
  studentName: string;
  matricule: string;
  teacherId: string;
  teacherName: string;
  sessionId: string;
  sessionName: string;
  sessionDate: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  promotionId: string;
  promotionName: string;
}

export interface AdminCorrectionPage {
  items: AdminCorrectionRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<CorrectionRequestStatus, number>;
  options: AdminAssiduityPage["options"];
}
