"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getViewerForRole } from "@/lib/authenticated-viewer";
import { withSerializableRetry } from "@/lib/database-retry";
import { SERIALIZABLE_TRANSACTION_OPTIONS } from "@/lib/transaction-options";
import { profilePhotoUrl } from "@/lib/profile-photo-domain";
import { deleteProfileAvatar } from "@/lib/profile-avatar.server";
import { createUserNotifications, deliverNotificationPush } from "@/lib/notifications.server";
import type { ProfilePhotoReviewSummary } from "@/types/account";
import type { AuthActionResult } from "@/types/auth";

export async function getProfilePhotoReviews(): Promise<ProfilePhotoReviewSummary[]> {
  const viewer = await getViewerForRole("ADMIN");
  if (!viewer) return [];
  const submissions = await prisma.profilePhotoSubmission.findMany({
    where: { status: { in: ["PENDING", "APPROVED", "REJECTED"] } },
    orderBy: [{ status: "desc" }, { submittedAt: "desc" }],
    take: 100,
    include: {
      user: { select: { name: true, email: true, role: true } },
      reviewedBy: { select: { name: true } },
    },
  });
  return submissions.map((submission) => ({
    id: submission.id,
    userId: submission.userId,
    userName: submission.user.name,
    userEmail: submission.user.email,
    userRole: submission.user.role,
    status: submission.status,
    photoUrl: profilePhotoUrl(submission.id),
    submittedAt: submission.submittedAt.toISOString(),
    reviewedAt: submission.reviewedAt?.toISOString(),
    reviewedByName: submission.reviewedBy?.name,
    reviewReason: submission.reviewReason ?? undefined,
  }));
}

export async function reviewProfilePhotoAction(
  submissionId: string,
  decision: "APPROVE" | "REJECT",
  reason?: string,
): Promise<AuthActionResult> {
  const viewer = await getViewerForRole("ADMIN");
  if (!viewer) return { ok: false, message: "Accès administrateur requis." };
  const normalizedReason = reason?.trim() ?? "";
  if (decision === "REJECT" && normalizedReason.length < 5) {
    return { ok: false, message: "Expliquez le refus en au moins 5 caractères.", fieldErrors: { reason: "Motif trop court." } };
  }

  try {
    const result = await withSerializableRetry(() => prisma.$transaction(async (tx) => {
      const submission = await tx.profilePhotoSubmission.findUnique({
        where: { id: submissionId },
        include: { user: { select: { id: true, name: true } } },
      });
      if (!submission || submission.status !== "PENDING") throw new Error("PHOTO_ALREADY_REVIEWED");

      let replacedUrl: string | undefined;
      if (decision === "APPROVE") {
        const previousApproved = await tx.profilePhotoSubmission.findFirst({
          where: { userId: submission.userId, status: "APPROVED" },
          select: { id: true, blobUrl: true },
        });
        if (previousApproved) {
          await tx.profilePhotoSubmission.update({
            where: { id: previousApproved.id },
            data: { status: "REPLACED" },
          });
          replacedUrl = previousApproved.blobUrl;
        }
        await tx.profilePhotoSubmission.update({
          where: { id: submission.id },
          data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: viewer.id, reviewReason: null },
        });
      } else {
        await tx.profilePhotoSubmission.update({
          where: { id: submission.id },
          data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: viewer.id, reviewReason: normalizedReason },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: viewer.id,
          action: decision === "APPROVE" ? "APPROVE_PROFILE_PHOTO" : "REJECT_PROFILE_PHOTO",
          entityType: "ProfilePhotoSubmission",
          entityId: submission.id,
          metadata: decision === "REJECT" ? { reason: normalizedReason } : undefined,
        },
      });
      const notificationIds = await createUserNotifications(tx, [submission.userId], {
        kind: "SYSTEM",
        title: decision === "APPROVE" ? "Photo approuvée" : "Photo à remplacer",
        body: decision === "APPROVE"
          ? "Votre photo de profil a été approuvée."
          : `Votre photo a été refusée : ${normalizedReason}`,
        href: "/account/profile",
        dedupeKey: `profile-photo-reviewed:${submission.id}`,
      });
      return { replacedUrl, notificationIds };
    }, SERIALIZABLE_TRANSACTION_OPTIONS));

    if (result.replacedUrl) await deleteProfileAvatar(result.replacedUrl).catch(() => undefined);
    await deliverNotificationPush(result.notificationIds).catch(() => undefined);
    revalidatePath("/admin/photo-reviews");
    revalidatePath("/account/profile");
    revalidatePath("/admin", "layout");
    revalidatePath("/teacher", "layout");
    revalidatePath("/student", "layout");
    return { ok: true, message: decision === "APPROVE" ? "Photo approuvée." : "Photo refusée et utilisateur informé." };
  } catch (error) {
    if (error instanceof Error && error.message === "PHOTO_ALREADY_REVIEWED") {
      return { ok: false, message: "Cette photo a déjà été traitée." };
    }
    return { ok: false, message: "La décision n’a pas pu être enregistrée." };
  }
}
