import "server-only";

import webPush from "web-push";
import type { NotificationKind, Prisma } from "@/generated/prisma/client";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferenceKey,
} from "@/lib/notification-domain";
import { prisma } from "@/lib/prisma";
import type { NotificationCenterData, NotificationPreferences, NotificationSummary } from "@/types/notifications";

type NotificationDatabase = Prisma.TransactionClient;

interface NotificationInput {
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  dedupeKey: string;
  expiresAt?: Date;
}

function toSummary(notification: {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  readAt: Date | null;
  createdAt: Date;
}): NotificationSummary {
  return {
    id: notification.id,
    kind: notification.kind,
    title: notification.title,
    body: notification.body,
    href: notification.href,
    ...(notification.readAt ? { readAt: notification.readAt.toISOString() } : {}),
    createdAt: notification.createdAt.toISOString(),
  };
}

export async function createUserNotifications(
  database: NotificationDatabase,
  userIds: string[],
  input: NotificationInput,
) {
  const uniqueUserIds = [...new Set(userIds)];
  if (!uniqueUserIds.length) return [];
  const preferences = await database.notificationPreference.findMany({
    where: { userId: { in: uniqueUserIds } },
  });
  const preferenceByUser = new Map(preferences.map((item) => [item.userId, item]));
  const requiredPreference = getNotificationPreferenceKey(input.kind);
  const eligibleUserIds = uniqueUserIds.filter((userId) => {
    if (!requiredPreference) return true;
    return (preferenceByUser.get(userId)?.[requiredPreference] ?? DEFAULT_NOTIFICATION_PREFERENCES[requiredPreference]) !== false;
  });
  const now = new Date();
  const records = [];
  for (const userId of eligibleUserIds) {
    records.push(await database.notification.upsert({
      where: { userId_dedupeKey: { userId, dedupeKey: input.dedupeKey } },
      create: { userId, ...input },
      update: {
        title: input.title,
        body: input.body,
        href: input.href,
        expiresAt: input.expiresAt ?? null,
        readAt: null,
        createdAt: now,
      },
      select: { id: true },
    }));
  }
  return records.map((record) => record.id);
}

function pushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
    && process.env.VAPID_PRIVATE_KEY?.trim()
    && process.env.VAPID_SUBJECT?.trim(),
  );
}

export async function deliverNotificationPush(notificationIds: string[]) {
  if (!notificationIds.length || !pushConfigured()) return;
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  const notifications = await prisma.notification.findMany({
    where: { id: { in: notificationIds } },
    include: {
      user: {
        select: {
          pushSubscriptions: {
            where: {
              revokedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          },
        },
      },
    },
  });
  const deliveries: Array<() => Promise<void>> = [];
  for (const notification of notifications) {
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      href: notification.href,
      tag: `${notification.kind}:${notification.id}`,
    });
    for (const subscription of notification.user.pushSubscriptions) {
      deliveries.push(async () => {
        try {
          await webPush.sendNotification({
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          }, payload, { TTL: 60 * 60, urgency: "high" });
          await prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: { lastUsedAt: new Date() },
          });
        } catch (error) {
          const statusCode = error && typeof error === "object" && "statusCode" in error
            ? Number(error.statusCode)
            : undefined;
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.update({
              where: { id: subscription.id },
              data: { revokedAt: new Date() },
            });
          } else {
            console.error(JSON.stringify({
              level: "error",
              message: "Web push delivery failed",
              subscriptionId: subscription.id,
              statusCode,
            }));
          }
        }
      });
    }
  }
  for (let index = 0; index < deliveries.length; index += 20) {
    await Promise.all(deliveries.slice(index, index + 20).map((deliver) => deliver()));
  }
}

export async function listNotificationsForUser(userId: string, limit = 30): Promise<NotificationCenterData> {
  const now = new Date();
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 50),
      select: { id: true, kind: true, title: true, body: true, href: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({
      where: { userId, readAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    }),
  ]);
  return { notifications: notifications.map(toSummary), unreadCount };
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const preferences = await prisma.notificationPreference.findUnique({ where: { userId } });
  return preferences ? {
    sessionUpdates: preferences.sessionUpdates,
    correctionUpdates: preferences.correctionUpdates,
    attendanceAlerts: preferences.attendanceAlerts,
  } : DEFAULT_NOTIFICATION_PREFERENCES;
}
