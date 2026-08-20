import type { NotificationKind } from "@/generated/prisma/client";

export interface NotificationSummary {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  sessionUpdates: boolean;
  correctionUpdates: boolean;
  attendanceAlerts: boolean;
}

export interface BrowserPushSubscriptionInput {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationCenterData {
  notifications: NotificationSummary[];
  unreadCount: number;
}
