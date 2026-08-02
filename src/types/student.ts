import type { AttendanceSource, AttendanceStatus } from "@/types";

export type CorrectionRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface AttendanceCorrectionRequest {
  id: string;
  sessionId: string;
  attendanceId?: string;
  studentId: string;
  teacherId: string;
  requestedStatus: Exclude<AttendanceStatus, "ABSENT">;
  reason: string;
  status: CorrectionRequestStatus;
  createdAt: string;
  updatedAt: string;
  decisionReason?: string;
  resolvedStatus?: AttendanceStatus;
  resolvedBy?: string;
  resolvedByName?: string;
  resolvedAt?: string;
}

export interface CorrectionRequestInput {
  sessionId: string;
  studentId: string;
  requestedStatus: Exclude<AttendanceStatus, "ABSENT">;
  reason: string;
}

export interface CorrectionResolutionInput {
  requestId: string;
  teacherId: string;
  decision: "APPROVE" | "REJECT";
  reason: string;
  resolvedStatus?: AttendanceStatus;
  checkedInAt?: string;
}

export type CheckInErrorCode =
  | "INVALID"
  | "EXPIRED"
  | "SESSION_CLOSED"
  | "WRONG_PROMOTION"
  | "ALREADY_RECORDED"
  | "PREVIEW_EXPIRED"
  | "NETWORK_ERROR"
  | "STUDENT_INACTIVE";

export interface CheckInPreview {
  sessionId: string;
  studentId: string;
  token: string;
  source: Extract<AttendanceSource, "QR" | "STUDENT_CODE">;
  validatedAt: number;
  confirmationExpiresAt: number;
  receipt?: string;
}

export type CheckInValidationResult =
  | { ok: true; preview: CheckInPreview; alreadyRecorded: boolean }
  | { ok: false; code: CheckInErrorCode; message: string };

export interface StudentCheckInInput extends CheckInPreview {
  confirmedAt: number;
}
