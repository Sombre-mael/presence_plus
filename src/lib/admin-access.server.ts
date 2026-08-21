import "server-only";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { AuthenticatedViewer } from "@/lib/authenticated-viewer";

export function isSuperAdmin(viewer: AuthenticatedViewer | null | undefined): viewer is AuthenticatedViewer & { role: "ADMIN"; adminLevel: "SUPER" } {
  return viewer?.role === "ADMIN" && viewer.adminLevel === "SUPER";
}

export async function verifyViewerPassword(userId: string, currentPassword?: string) {
  if (!currentPassword) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  return Boolean(user && await bcrypt.compare(currentPassword, user.passwordHash));
}
