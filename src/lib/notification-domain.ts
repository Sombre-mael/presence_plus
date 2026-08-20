import type { NotificationKind } from "@/generated/prisma/client";
import type { NotificationPreferences } from "@/types/notifications";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  sessionUpdates: true,
  correctionUpdates: true,
  attendanceAlerts: true,
};

export function getNotificationPreferenceKey(
  kind: NotificationKind,
): keyof NotificationPreferences | undefined {
  if (kind.startsWith("SESSION_")) return "sessionUpdates";
  if (kind.startsWith("CORRECTION_")) return "correctionUpdates";
  if (kind === "ATTENDANCE_ALERT") return "attendanceAlerts";
  return undefined;
}

export function isAllowedPushEndpoint(value: string) {
  try {
    const { protocol, hostname } = new URL(value);
    if (protocol !== "https:") return false;
    return hostname === "fcm.googleapis.com"
      || hostname === "web.push.apple.com"
      || hostname.endsWith(".push.apple.com")
      || hostname.endsWith(".push.services.mozilla.com")
      || hostname.endsWith(".notify.windows.com");
  } catch {
    return false;
  }
}
