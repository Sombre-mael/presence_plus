import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validateAuthSession } from "@/lib/auth-session.server";
import { withDatabaseRetry } from "@/lib/database-retry";
import { buildAccountPhotoState } from "@/lib/profile-photo-domain";
import { getProfilePhotoEnforcementAt } from "@/lib/profile-photo.server";
import { PRIVACY_VERSION, TERMS_VERSION, hasCurrentLegalAcceptance } from "@/lib/legal-policy";
import type { Role, UserSummary } from "@/types";

export type AuthenticatedViewer = UserSummary & {
  promotionId?: string;
  sessionVersion: number;
  mustChangePassword: boolean;
  authSessionId: string;
  legalAcceptanceRequired: boolean;
};

export async function getAuthenticatedViewer(): Promise<AuthenticatedViewer | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.authSessionId) return null;
  const [user, validAuthSession, enforcementAt] = await withDatabaseRetry(() => Promise.all([prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      preferredName: true,
      email: true,
      avatarUrl: true,
      avatarColor: true,
      role: true,
      adminLevel: true,
      status: true,
      promotionId: true,
      promotion: { select: { name: true } },
      activatedAt: true,
      mustChangePassword: true,
      sessionVersion: true,
      profilePhotoSubmissions: {
        where: { status: { in: ["APPROVED", "PENDING", "REJECTED"] } },
        orderBy: { submittedAt: "desc" },
        select: { id: true, status: true, submittedAt: true, reviewedAt: true, reviewReason: true },
        take: 4,
      },
      legalAcceptances: {
        where: {
          OR: [
            { documentType: "TERMS", version: TERMS_VERSION },
            { documentType: "PRIVACY_NOTICE", version: PRIVACY_VERSION },
          ],
        },
        select: { documentType: true, version: true },
      },
    },
  }), validateAuthSession(session.user.authSessionId, session.user.id), getProfilePhotoEnforcementAt()]));
  if (!validAuthSession || !user || user.status !== "ACTIVE" || !user.activatedAt || user.sessionVersion !== session.user.sessionVersion) return null;
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
  const legalAcceptance = hasCurrentLegalAcceptance(user.legalAcceptances);
  return {
    id: user.id,
    name: user.name,
    preferredName: user.preferredName ?? undefined,
    email: user.email,
    avatarUrl: photo.approvedPhotoUrl ?? user.avatarUrl ?? undefined,
    avatarColor: user.avatarColor,
    role: user.role,
    adminLevel: user.adminLevel ?? undefined,
    status: user.status,
    promotion: user.promotion?.name,
    promotionId: user.promotionId ?? undefined,
    sessionVersion: user.sessionVersion,
    mustChangePassword: user.mustChangePassword,
    authSessionId: session.user.authSessionId,
    legalAcceptanceRequired: !legalAcceptance.complete,
    profilePhotoStatus: photo.status,
    profilePhotoEnforcementAt: photo.enforcementAt,
    profilePhotoRequired: photo.requiredNow,
  };
}

export async function getViewerForRole(role: Role) {
  const viewer = await getAuthenticatedViewer();
  return viewer?.role === role && !viewer.mustChangePassword && !viewer.legalAcceptanceRequired ? viewer : null;
}

export async function getBusinessViewer() {
  const viewer = await getAuthenticatedViewer();
  return viewer && !viewer.mustChangePassword && !viewer.legalAcceptanceRequired ? viewer : null;
}
