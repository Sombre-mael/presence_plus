import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validateAuthSession } from "@/lib/auth-session.server";
import { withDatabaseRetry } from "@/lib/database-retry";
import type { Role, UserSummary } from "@/types";

export type AuthenticatedViewer = UserSummary & {
  promotionId?: string;
  sessionVersion: number;
  mustChangePassword: boolean;
  authSessionId: string;
};

export async function getAuthenticatedViewer(): Promise<AuthenticatedViewer | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.authSessionId) return null;
  const [user, validAuthSession] = await withDatabaseRetry(() => Promise.all([prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      promotionId: true,
      promotion: { select: { name: true } },
      activatedAt: true,
      mustChangePassword: true,
      sessionVersion: true,
    },
  }), validateAuthSession(session.user.authSessionId, session.user.id)]));
  if (!validAuthSession || !user || user.status !== "ACTIVE" || !user.activatedAt || user.sessionVersion !== session.user.sessionVersion) return null;
  return {
    id: user.id,
    name: user.name,
    ...(user.email ? { email: user.email } : {}),
    role: user.role,
    status: user.status,
    promotion: user.promotion?.name,
    promotionId: user.promotionId ?? undefined,
    sessionVersion: user.sessionVersion,
    mustChangePassword: user.mustChangePassword,
    authSessionId: session.user.authSessionId,
  };
}

export async function getViewerForRole(role: Role) {
  const viewer = await getAuthenticatedViewer();
  return viewer?.role === role && !viewer.mustChangePassword ? viewer : null;
}

export async function getBusinessViewer() {
  const viewer = await getAuthenticatedViewer();
  return viewer && !viewer.mustChangePassword ? viewer : null;
}
