import type { AttendancePolicy } from "@/types/admin";

export const DEFAULT_ATTENDANCE_POLICY: AttendancePolicy = {
  attendanceAlertThreshold: 80,
  defaultLateThresholdMinutes: 10,
  sessionStartEarlyMinutes: 30,
  qrRotationSeconds: 10,
  correctionWindowDays: 30,
};

export function attendancePolicyOf(value?: Partial<AttendancePolicy> | null): AttendancePolicy {
  return { ...DEFAULT_ATTENDANCE_POLICY, ...value };
}
