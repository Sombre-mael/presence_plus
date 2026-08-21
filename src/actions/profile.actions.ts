"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getBusinessViewer } from "@/lib/authenticated-viewer";
import { withDatabaseRetry, withSerializableRetry } from "@/lib/database-retry";
import { accountProfileUpdateSchema, profileFieldErrors } from "@/lib/profile-domain";
import {
  assertProfileAvatarStorageConfigured,
  deleteProfileAvatar,
  ProfileAvatarError,
  storeProfileAvatar,
} from "@/lib/profile-avatar.server";
import { getUserProfilePhotoState } from "@/lib/profile-photo.server";
import { createUserNotifications, deliverNotificationPush } from "@/lib/notifications.server";
import type {
  AccountAvatarMutationValue,
  AccountPersonalization,
  AccountProfileUpdateInput,
} from "@/types/account";
import type { AuthActionResult } from "@/types/auth";

export async function updateOwnProfileAction(
  input: AccountProfileUpdateInput,
): Promise<AuthActionResult<AccountPersonalization>> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, message: "Votre session a expiré." };

  const parsed = accountProfileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Vérifiez les informations saisies.",
      fieldErrors: profileFieldErrors(parsed.error),
    };
  }

  try {
    const result = await withDatabaseRetry(() => prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: { id: viewer.id },
        select: { preferredName: true, phone: true, avatarColor: true },
      });
      if (!current) throw new Error("ACCOUNT_NOT_FOUND");

      const preferredName = parsed.data.preferredName || null;
      const phone = parsed.data.phone || null;
      const changed = current.preferredName !== preferredName
        || current.phone !== phone
        || current.avatarColor !== parsed.data.avatarColor;

      const updated = changed
        ? await tx.user.update({
            where: { id: viewer.id },
            data: { preferredName, phone, avatarColor: parsed.data.avatarColor },
            select: { preferredName: true, phone: true, avatarColor: true },
          })
        : current;

      if (changed) {
        await tx.auditLog.create({
          data: {
            actorId: viewer.id,
            action: "UPDATE_OWN_PROFILE",
            entityType: "User",
            entityId: viewer.id,
            metadata: { personalized: true },
          },
        });
      }

      return { updated, changed };
    }));

    revalidatePath("/account/profile");
    revalidatePath(`/${viewer.role.toLowerCase()}`, "layout");

    return {
      ok: true,
      message: result.changed ? "Votre profil a été personnalisé." : "Aucune modification à enregistrer.",
      value: {
        preferredName: result.updated.preferredName ?? undefined,
        phone: result.updated.phone ?? undefined,
        avatarColor: result.updated.avatarColor,
      },
    };
  } catch {
    return { ok: false, message: "Le profil n’a pas pu être enregistré. Réessayez." };
  }
}

function revalidateProfile(role: string) {
  revalidatePath("/account/profile");
  revalidatePath(`/${role.toLowerCase()}`, "layout");
}

export async function uploadOwnAvatarAction(
  formData: FormData,
): Promise<AuthActionResult<AccountAvatarMutationValue>> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, message: "Votre session a expiré." };

  const file = formData.get("avatar");
  if (!(file instanceof File)) return { ok: false, message: "Choisissez une photo à importer." };

  let uploadedUrl: string | undefined;
  try {
    uploadedUrl = await storeProfileAvatar(viewer.id, file);
    const result = await withSerializableRetry(() => prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id: viewer.id }, select: { id: true } });
      if (!current) throw new Error("ACCOUNT_NOT_FOUND");
      const previousPending = await tx.profilePhotoSubmission.findFirst({
        where: { userId: viewer.id, status: "PENDING" },
        select: { id: true, blobUrl: true },
      });
      if (previousPending) {
        await tx.profilePhotoSubmission.update({
          where: { id: previousPending.id },
          data: { status: "CANCELLED", reviewedAt: new Date(), reviewReason: "Remplacée par une nouvelle soumission." },
        });
      }
      const submission = await tx.profilePhotoSubmission.create({
        data: { userId: viewer.id, blobUrl: uploadedUrl! },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: viewer.id,
          action: "SUBMIT_PROFILE_PHOTO",
          entityType: "ProfilePhotoSubmission",
          entityId: submission.id,
          metadata: { replacement: Boolean(previousPending) },
        },
      });
      const admins = await tx.user.findMany({
        where: { role: "ADMIN", status: "ACTIVE" },
        select: { id: true },
      });
      const notificationIds = await createUserNotifications(tx, admins.map((admin) => admin.id), {
        kind: "SYSTEM",
        title: "Photo à vérifier",
        body: `${viewer.name} a soumis une photo de profil.`,
        href: `/admin/photo-reviews?submission=${submission.id}`,
        dedupeKey: `profile-photo-submitted:${submission.id}`,
      });
      return { previousPendingUrl: previousPending?.blobUrl, notificationIds };
    }, { isolationLevel: "Serializable" }));

    if (result.previousPendingUrl) await deleteProfileAvatar(result.previousPendingUrl).catch(() => undefined);
    await deliverNotificationPush(result.notificationIds).catch(() => undefined);
    revalidateProfile(viewer.role);
    revalidatePath("/admin/photo-reviews");
    return {
      ok: true,
      message: "Votre photo a été envoyée pour vérification.",
      value: { photoState: await getUserProfilePhotoState(viewer.id) },
    };
  } catch (error) {
    if (uploadedUrl) await deleteProfileAvatar(uploadedUrl).catch(() => undefined);
    return {
      ok: false,
      message: error instanceof ProfileAvatarError
        ? error.message
        : "La photo n’a pas pu être enregistrée. Réessayez.",
    };
  }
}

export async function removeOwnAvatarAction(): Promise<AuthActionResult<AccountAvatarMutationValue>> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, message: "Votre session a expiré." };

  try {
    assertProfileAvatarStorageConfigured();
    const removedUrls = await withSerializableRetry(() => prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id: viewer.id }, select: { avatarUrl: true, role: true } });
      if (!current) throw new Error("ACCOUNT_NOT_FOUND");
      const submissions = await tx.profilePhotoSubmission.findMany({
        where: { userId: viewer.id, status: { in: ["PENDING", "APPROVED"] } },
        select: { id: true, status: true, blobUrl: true },
      });
      const approved = submissions.find((item) => item.status === "APPROVED");
      if (current.role === "STUDENT" && approved) {
        throw new ProfileAvatarError("Une photo approuvée ne peut être retirée sans soumettre un remplacement.");
      }
      if (!current.avatarUrl && !submissions.length) return [];

      await tx.profilePhotoSubmission.updateMany({
        where: { userId: viewer.id, status: { in: ["PENDING", "APPROVED"] } },
        data: { status: "CANCELLED", reviewedAt: new Date(), reviewReason: "Retirée par le titulaire du compte." },
      });
      await tx.user.update({ where: { id: viewer.id }, data: { avatarUrl: null } });
      await tx.auditLog.create({
        data: {
          actorId: viewer.id,
          action: "REMOVE_PROFILE_PHOTO",
          entityType: "User",
          entityId: viewer.id,
          metadata: { approvedPhotoRemoved: Boolean(approved) },
        },
      });
      return [...submissions.map((item) => item.blobUrl), ...(current.avatarUrl ? [current.avatarUrl] : [])];
    }, { isolationLevel: "Serializable" }));

    await Promise.all(removedUrls.map((url) => deleteProfileAvatar(url).catch(() => undefined)));
    revalidateProfile(viewer.role);
    return {
      ok: true,
      message: removedUrls.length ? "Votre photo de profil a été retirée." : "Aucune photo à retirer.",
      value: { photoState: await getUserProfilePhotoState(viewer.id) },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof ProfileAvatarError
        ? error.message
        : "La photo n’a pas pu être supprimée. Réessayez.",
    };
  }
}
