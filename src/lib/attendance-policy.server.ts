import "server-only";

import { prisma } from "@/lib/prisma";
import { DEFAULT_PROFILE_PHOTO_ENFORCEMENT_AT } from "@/lib/profile-photo.server";
import { attendancePolicyOf } from "@/lib/attendance-policy";

export async function getAttendancePolicy() {
  const setting = await prisma.systemSetting.findUnique({
    where: { id: "default" },
    select: {
      attendanceAlertThreshold: true,
      defaultLateThresholdMinutes: true,
      sessionStartEarlyMinutes: true,
      qrRotationSeconds: true,
      correctionWindowDays: true,
    },
  });
  return attendancePolicyOf(setting);
}

export async function ensureSystemSetting() {
  return prisma.systemSetting.upsert({
    where: { id: "default" },
    create: { id: "default", profilePhotoEnforcementAt: DEFAULT_PROFILE_PHOTO_ENFORCEMENT_AT },
    update: {},
  });
}
