import "server-only";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { deleteProfileAvatar } from "@/lib/profile-avatar.server";
import { FIXED_RETENTION, monthsBefore } from "@/lib/legal-policy";
import { unusablePassword } from "@/lib/auth-crypto.server";
import { withSerializableRetry } from "@/lib/database-retry";
import { SERIALIZABLE_TRANSACTION_OPTIONS } from "@/lib/transaction-options";

function daysBefore(now: Date, days: number) {
  return new Date(now.getTime() - days * 24 * 60 * 60_000);
}

function hoursBefore(now: Date, hours: number) {
  return new Date(now.getTime() - hours * 60 * 60_000);
}

export async function applyPrivacyRetention(now = new Date()) {
  const setting = await prisma.systemSetting.findUnique({
    where: { id: "default" },
    select: { academicRetentionMonths: true, auditRetentionMonths: true },
  });
  const academicCutoff = monthsBefore(now, setting?.academicRetentionMonths ?? 60);
  const auditCutoff = monthsBefore(now, setting?.auditRetentionMonths ?? 24);
  const notificationCutoff = daysBefore(now, FIXED_RETENTION.readNotificationsDays);
  const sessionCutoff = daysBefore(now, FIXED_RETENTION.authSessionsDays);
  const throttleCutoff = hoursBefore(now, FIXED_RETENTION.authThrottlesHours);
  const tokenCutoff = daysBefore(now, FIXED_RETENTION.authTokensDays);
  const photoCutoff = daysBefore(now, FIXED_RETENTION.abandonedPhotoDays);
  const pushCutoff = daysBefore(now, FIXED_RETENTION.revokedPushDays);

  const [abandonedPhotos, anonymizationCandidates] = await Promise.all([
    prisma.profilePhotoSubmission.findMany({
      where: {
        OR: [
          { status: { in: ["REJECTED", "CANCELLED"] } },
          { status: "PENDING", submittedAt: { lt: photoCutoff } },
        ],
      },
      select: { id: true, blobUrl: true, status: true },
    }),
    prisma.user.findMany({
      where: { status: "INACTIVE", anonymizedAt: null, dataRetentionStartedAt: { lt: academicCutoff } },
      select: {
        id: true,
        avatarUrl: true,
        profilePhotoSubmissions: { select: { blobUrl: true } },
      },
    }),
  ]);

  const inaccessiblePasswordHash = await bcrypt.hash(unusablePassword(), 12);
  const summary = await withSerializableRetry(() => prisma.$transaction(async (tx) => {
    const abandonedPending = abandonedPhotos.filter((photo) => photo.status === "PENDING").map((photo) => photo.id);
    if (abandonedPending.length) {
      await tx.profilePhotoSubmission.updateMany({
        where: { id: { in: abandonedPending }, status: "PENDING" },
        data: { status: "CANCELLED", reviewedAt: now, reviewReason: "Soumission abandonnée après 30 jours." },
      });
    }

    let anonymizedUsers = 0;
    for (const user of anonymizationCandidates) {
      const updated = await tx.user.updateMany({
        where: { id: user.id, status: "INACTIVE", anonymizedAt: null, dataRetentionStartedAt: { lt: academicCutoff } },
        data: {
          name: "Utilisateur anonymisé",
          preferredName: null,
          email: `anonymized+${user.id}@deleted.invalid`,
          phone: null,
          matricule: null,
          avatarUrl: null,
          passwordHash: inaccessiblePasswordHash,
          activatedAt: null,
          mustChangePassword: true,
          lastLoginAt: null,
          sessionVersion: { increment: 1 },
          anonymizedAt: now,
        },
      });
      if (!updated.count) continue;
      anonymizedUsers += updated.count;
      await Promise.all([
        tx.authToken.deleteMany({ where: { userId: user.id } }),
        tx.authThrottle.deleteMany({ where: { userId: user.id } }),
        tx.authSession.deleteMany({ where: { userId: user.id } }),
        tx.notification.deleteMany({ where: { userId: user.id } }),
        tx.notificationPreference.deleteMany({ where: { userId: user.id } }),
        tx.pushSubscription.deleteMany({ where: { userId: user.id } }),
        tx.legalAcceptance.deleteMany({ where: { userId: user.id } }),
        tx.dataSubjectRequest.updateMany({
          where: { userId: user.id },
          data: { details: null, responseMessage: "Demande clôturée avant anonymisation du compte." },
        }),
        tx.profilePhotoSubmission.updateMany({
          where: { userId: user.id, status: { not: "CANCELLED" } },
          data: { status: "CANCELLED", reviewedAt: now, reviewReason: "Compte anonymisé à l’issue de la conservation." },
        }),
      ]);
    }

    const [tokens, throttles, sessions, notifications, pushSubscriptions, auditLogs] = await Promise.all([
      tx.authToken.deleteMany({ where: { OR: [{ expiresAt: { lt: tokenCutoff } }, { usedAt: { lt: tokenCutoff } }] } }),
      tx.authThrottle.deleteMany({ where: { updatedAt: { lt: throttleCutoff } } }),
      tx.authSession.deleteMany({ where: { OR: [{ expiresAt: { lt: sessionCutoff } }, { revokedAt: { lt: sessionCutoff } }] } }),
      tx.notification.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { readAt: { lt: notificationCutoff } }] } }),
      tx.pushSubscription.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: pushCutoff } }] } }),
      tx.auditLog.deleteMany({ where: { createdAt: { lt: auditCutoff } } }),
    ]);

    const counts = {
      anonymizedUsers,
      tokens: tokens.count,
      throttles: throttles.count,
      sessions: sessions.count,
      notifications: notifications.count,
      pushSubscriptions: pushSubscriptions.count,
      auditLogs: auditLogs.count,
      photoFiles: abandonedPhotos.length + anonymizationCandidates.flatMap((user) => user.profilePhotoSubmissions).length,
    };
    await tx.auditLog.create({
      data: { actorId: null, action: "APPLY_PRIVACY_RETENTION", entityType: "SystemSetting", entityId: "default", metadata: counts },
    });
    return counts;
  }, SERIALIZABLE_TRANSACTION_OPTIONS));

  const photoUrls = new Set([
    ...abandonedPhotos.map((photo) => photo.blobUrl),
    ...anonymizationCandidates.flatMap((user) => [user.avatarUrl, ...user.profilePhotoSubmissions.map((photo) => photo.blobUrl)]),
  ].filter((url): url is string => Boolean(url)));
  await Promise.allSettled([...photoUrls].map((url) => deleteProfileAvatar(url)));
  return { ...summary, photoFiles: photoUrls.size };
}
