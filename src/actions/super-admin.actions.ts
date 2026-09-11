"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getViewerForRole } from "@/lib/authenticated-viewer";
import { isSuperAdmin, verifyViewerPassword } from "@/lib/admin-access.server";
import { revokeAuthSessions } from "@/lib/auth-session.server";
import { withSerializableRetry } from "@/lib/database-retry";
import { SERIALIZABLE_TRANSACTION_OPTIONS } from "@/lib/transaction-options";
import { getProfilePhotoEnforcementAt } from "@/lib/profile-photo.server";
import type { AdminLevel } from "@/types";
import type { SystemAdministrationData } from "@/types/admin";
import type { AuthActionResult } from "@/types/auth";
import { z } from "zod";
import { getAttendancePolicy } from "@/lib/attendance-policy.server";
import type { AttendancePolicy } from "@/types/admin";

const attendancePolicySchema = z.object({
  attendanceAlertThreshold: z.coerce.number().int().min(50).max(100),
  defaultLateThresholdMinutes: z.coerce.number().int().min(0).max(60),
  sessionStartEarlyMinutes: z.coerce.number().int().min(0).max(120),
  qrRotationSeconds: z.coerce.number().int().min(10).max(60),
  correctionWindowDays: z.coerce.number().int().min(1).max(180),
});

export async function getSystemAdministrationData(): Promise<SystemAdministrationData | null> {
  const viewer = await getViewerForRole("ADMIN");
  if (!isSuperAdmin(viewer)) return null;
  const now = new Date();
  const [admins, enforcementAt, attendancePolicy] = await Promise.all([
    prisma.user.findMany({
      where: { role: "ADMIN" },
      orderBy: [{ adminLevel: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        adminLevel: true,
        status: true,
        lastLoginAt: true,
        _count: { select: { authSessions: { where: { revokedAt: null, expiresAt: { gt: now } } } } },
      },
    }),
    getProfilePhotoEnforcementAt(),
    getAttendancePolicy(),
  ]);
  return {
    admins: admins.flatMap((admin) => admin.adminLevel ? [{
      id: admin.id,
      name: admin.name,
      email: admin.email,
      adminLevel: admin.adminLevel,
      status: admin.status,
      activeSessionCount: admin._count.authSessions,
      lastLoginAt: admin.lastLoginAt?.toISOString(),
    }] : []),
    profilePhotoEnforcementAt: enforcementAt.toISOString(),
    attendancePolicy,
  };
}

export async function updateAttendancePolicyAction(
  input: AttendancePolicy,
  currentPassword: string,
): Promise<AuthActionResult<AttendancePolicy>> {
  const viewer = await getViewerForRole("ADMIN");
  if (!isSuperAdmin(viewer)) return { ok: false, message: "Accès super administrateur requis." };
  if (!await verifyViewerPassword(viewer.id, currentPassword)) {
    return { ok: false, message: "Le mot de passe actuel est incorrect.", fieldErrors: { currentPassword: "Vérifiez votre mot de passe." } };
  }
  const parsed = attendancePolicySchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    return { ok: false, message: "Vérifiez les règles saisies.", fieldErrors };
  }
  const policy = parsed.data;
  try {
    await withSerializableRetry(() => prisma.$transaction(async (tx) => {
      await tx.systemSetting.upsert({
        where: { id: "default" },
        create: { id: "default", profilePhotoEnforcementAt: new Date("2100-01-01T00:00:00.000Z"), ...policy },
        update: policy,
      });
      await tx.auditLog.create({
        data: { actorId: viewer.id, action: "UPDATE_ATTENDANCE_POLICY", entityType: "SystemSetting", entityId: "default", metadata: policy },
      });
    }, SERIALIZABLE_TRANSACTION_OPTIONS));
    revalidatePath("/admin/system");
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Les règles de présence ont été mises à jour.", value: policy };
  } catch {
    return { ok: false, message: "Les règles de présence n’ont pas pu être enregistrées. Réessayez." };
  }
}

export async function updateAdminLevelAction(
  targetId: string,
  nextLevel: AdminLevel,
  currentPassword: string,
): Promise<AuthActionResult> {
  const viewer = await getViewerForRole("ADMIN");
  if (!isSuperAdmin(viewer)) return { ok: false, message: "Accès super administrateur requis." };
  if (!await verifyViewerPassword(viewer.id, currentPassword)) {
    return { ok: false, message: "Le mot de passe actuel est incorrect.", fieldErrors: { currentPassword: "Vérifiez votre mot de passe." } };
  }

  try {
    await withSerializableRetry(() => prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: targetId },
        select: { role: true, status: true, adminLevel: true },
      });
      if (!target || target.role !== "ADMIN" || !target.adminLevel) throw new Error("ADMIN_NOT_FOUND");
      if (target.adminLevel === nextLevel) return;
      if (target.adminLevel === "SUPER" && nextLevel === "STANDARD" && target.status === "ACTIVE") {
        const otherSuperAdmins = await tx.user.count({
          where: { id: { not: targetId }, role: "ADMIN", adminLevel: "SUPER", status: "ACTIVE" },
        });
        if (!otherSuperAdmins) throw new Error("LAST_SUPER_ADMIN");
      }
      const now = new Date();
      await tx.user.update({
        where: { id: targetId },
        data: { adminLevel: nextLevel, sessionVersion: { increment: 1 } },
      });
      await revokeAuthSessions(tx, targetId, "ADMIN_LEVEL_CHANGED", undefined, now);
      await tx.auditLog.create({
        data: {
          actorId: viewer.id,
          action: nextLevel === "SUPER" ? "PROMOTE_SUPER_ADMIN" : "DEMOTE_SUPER_ADMIN",
          entityType: "User",
          entityId: targetId,
          metadata: { previousLevel: target.adminLevel, nextLevel },
        },
      });
    }, SERIALIZABLE_TRANSACTION_OPTIONS));
    revalidatePath("/admin/system");
    revalidatePath("/admin/users");
    revalidatePath("/admin", "layout");
    return { ok: true, message: nextLevel === "SUPER" ? "Le compte est maintenant super administrateur." : "Le compte est maintenant administrateur standard." };
  } catch (error) {
    if (error instanceof Error && error.message === "LAST_SUPER_ADMIN") return { ok: false, message: "Le dernier super administrateur actif ne peut pas être rétrogradé." };
    if (error instanceof Error && error.message === "ADMIN_NOT_FOUND") return { ok: false, message: "Compte administrateur introuvable." };
    return { ok: false, message: "Le niveau d’administration n’a pas pu être modifié." };
  }
}
