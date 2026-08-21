import "server-only";

import { prisma } from "@/lib/prisma";
import { withDatabaseRetry } from "@/lib/database-retry";
import type { AccountProfile } from "@/types/account";
import { buildAccountPhotoState } from "@/lib/profile-photo-domain";
import { getProfilePhotoEnforcementAt } from "@/lib/profile-photo.server";

export async function getAccountProfile(userId: string): Promise<AccountProfile | null> {
  const [user, enforcementAt] = await withDatabaseRetry(() => Promise.all([prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      preferredName: true,
      email: true,
      phone: true,
      avatarUrl: true,
      avatarColor: true,
      role: true,
      adminLevel: true,
      status: true,
      matricule: true,
      createdAt: true,
      activatedAt: true,
      lastLoginAt: true,
      profilePhotoSubmissions: {
        where: { status: { in: ["APPROVED", "PENDING", "REJECTED"] } },
        orderBy: { submittedAt: "desc" },
        select: { id: true, status: true, submittedAt: true, reviewedAt: true, reviewReason: true },
        take: 4,
      },
      promotion: {
        select: {
          id: true,
          name: true,
          department: true,
          academicYear: true,
        },
      },
      courses: {
        orderBy: [{ active: "desc" }, { name: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
          active: true,
          weeklyHours: true,
          promotion: { select: { name: true } },
        },
      },
    },
  }), getProfilePhotoEnforcementAt()]));

  if (!user) return null;

  const approved = user.profilePhotoSubmissions.find((item) => item.status === "APPROVED");
  const pending = user.profilePhotoSubmissions.find((item) => item.status === "PENDING");
  const rejected = user.profilePhotoSubmissions.find((item) => item.status === "REJECTED");
  const photo = buildAccountPhotoState({
    approvedId: approved?.id,
    pendingSubmittedAt: pending?.submittedAt,
    latestRejectedAt: rejected?.reviewedAt ?? undefined,
    reviewReason: rejected?.reviewReason ?? undefined,
    enforcementAt,
  });

  return {
    id: user.id,
    name: user.name,
    preferredName: user.preferredName ?? undefined,
    email: user.email,
    phone: user.phone ?? undefined,
    avatarUrl: photo.approvedPhotoUrl ?? user.avatarUrl ?? undefined,
    avatarColor: user.avatarColor,
    role: user.role,
    adminLevel: user.adminLevel ?? undefined,
    status: user.status,
    photo,
    matricule: user.matricule ?? undefined,
    promotion: user.promotion ?? undefined,
    courses: user.courses.map((course) => ({
      id: course.id,
      code: course.code,
      name: course.name,
      active: course.active,
      weeklyHours: course.weeklyHours,
      promotion: course.promotion.name,
    })),
    createdAt: user.createdAt.toISOString(),
    activatedAt: user.activatedAt?.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString(),
  };
}
