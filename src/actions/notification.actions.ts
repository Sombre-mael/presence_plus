"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getBusinessViewer } from "@/lib/authenticated-viewer";
import { isAllowedPushEndpoint } from "@/lib/notification-domain";
import type { BrowserPushSubscriptionInput, NotificationPreferences } from "@/types/notifications";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048).refine(isAllowedPushEndpoint),
  expirationTime: z.number().positive().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(20).max(512),
    auth: z.string().min(8).max(256),
  }),
});

const preferencesSchema = z.object({
  sessionUpdates: z.boolean(),
  correctionUpdates: z.boolean(),
  attendanceAlerts: z.boolean(),
});

export async function savePushSubscriptionAction(input: BrowserPushSubscriptionInput) {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false as const, message: "Votre session a expiré." };
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Cet abonnement push n’est pas valide." };
  const userAgent = (await headers()).get("user-agent")?.slice(0, 512) ?? null;
  await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    create: {
      userId: viewer.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent,
      expiresAt: parsed.data.expirationTime ? new Date(parsed.data.expirationTime) : null,
    },
    update: {
      userId: viewer.id,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent,
      expiresAt: parsed.data.expirationTime ? new Date(parsed.data.expirationTime) : null,
      revokedAt: null,
    },
  });
  await prisma.auditLog.create({
    data: { actorId: viewer.id, action: "ENABLE_PUSH_NOTIFICATIONS", entityType: "User", entityId: viewer.id },
  });
  return { ok: true as const, message: "Notifications activées sur cet appareil." };
}

export async function removePushSubscriptionAction(endpoint: string) {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false as const, message: "Votre session a expiré." };
  const parsed = z.string().url().max(2048).safeParse(endpoint);
  if (!parsed.success) return { ok: false as const, message: "Abonnement invalide." };
  await prisma.pushSubscription.updateMany({
    where: { userId: viewer.id, endpoint: parsed.data, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: { actorId: viewer.id, action: "DISABLE_PUSH_NOTIFICATIONS", entityType: "User", entityId: viewer.id },
  });
  return { ok: true as const, message: "Notifications désactivées sur cet appareil." };
}

export async function markNotificationReadAction(id: string) {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false as const };
  await prisma.notification.updateMany({
    where: { id, userId: viewer.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true as const };
}

export async function markAllNotificationsReadAction() {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false as const };
  await prisma.notification.updateMany({
    where: { userId: viewer.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true as const };
}

export async function updateNotificationPreferencesAction(input: NotificationPreferences) {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false as const, message: "Votre session a expiré." };
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Préférences invalides." };
  await prisma.notificationPreference.upsert({
    where: { userId: viewer.id },
    create: { userId: viewer.id, ...parsed.data },
    update: parsed.data,
  });
  return { ok: true as const, message: "Préférences enregistrées." };
}
