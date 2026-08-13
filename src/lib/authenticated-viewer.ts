import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role, UserSummary } from "@/types";

export type AuthenticatedViewer = UserSummary & {
  promotionId?: string;
  sessionVersion: number;
  mustChangePassword: boolean;
};

export async function getAuthenticatedViewer(): Promise<AuthenticatedViewer | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
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
  });
  if (!user || user.status !== "ACTIVE" || !user.activatedAt || user.sessionVersion !== session.user.sessionVersion) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    promotion: user.promotion?.name,
    promotionId: user.promotionId ?? undefined,
    sessionVersion: user.sessionVersion,
    mustChangePassword: user.mustChangePassword,
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
