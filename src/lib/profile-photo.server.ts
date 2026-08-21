import "server-only";

import { prisma } from "@/lib/prisma";
import { buildAccountPhotoState } from "@/lib/profile-photo-domain";

export const DEFAULT_PROFILE_PHOTO_ENFORCEMENT_AT = new Date("2100-01-01T00:00:00.000Z");

export async function getProfilePhotoEnforcementAt() {
  const setting = await prisma.systemSetting.findUnique({
    where: { id: "default" },
    select: { profilePhotoEnforcementAt: true },
  });
  return setting?.profilePhotoEnforcementAt ?? DEFAULT_PROFILE_PHOTO_ENFORCEMENT_AT;
}

export async function getUserProfilePhotoState(userId: string, now = new Date()) {
  const [submissions, enforcementAt] = await Promise.all([
    prisma.profilePhotoSubmission.findMany({
      where: { userId, status: { in: ["APPROVED", "PENDING", "REJECTED"] } },
      orderBy: { submittedAt: "desc" },
      select: { id: true, status: true, submittedAt: true, reviewedAt: true, reviewReason: true },
      take: 4,
    }),
    getProfilePhotoEnforcementAt(),
  ]);
  const approved = submissions.find((item) => item.status === "APPROVED");
  const pending = submissions.find((item) => item.status === "PENDING");
  const rejected = submissions.find((item) => item.status === "REJECTED");
  return buildAccountPhotoState({
    approvedId: approved?.id,
    pendingSubmittedAt: pending?.submittedAt,
    latestRejectedAt: rejected?.reviewedAt ?? undefined,
    reviewReason: rejected?.reviewReason ?? undefined,
    enforcementAt,
    now,
  });
}

export async function studentHasApprovedProfilePhoto(userId: string) {
  return Boolean(await prisma.profilePhotoSubmission.findFirst({
    where: { userId, status: "APPROVED" },
    select: { id: true },
  }));
}

export async function studentProfilePhotoRequired(userId: string, now = new Date()) {
  const [approved, enforcementAt] = await Promise.all([
    studentHasApprovedProfilePhoto(userId),
    getProfilePhotoEnforcementAt(),
  ]);
  return !approved && now >= enforcementAt;
}
