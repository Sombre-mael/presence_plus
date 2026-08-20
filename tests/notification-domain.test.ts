import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferenceKey,
  isAllowedPushEndpoint,
} from "@/lib/notification-domain";

describe("règles de notifications", () => {
  it("classe chaque événement selon sa préférence utilisateur", () => {
    expect(getNotificationPreferenceKey("SESSION_STARTED")).toBe("sessionUpdates");
    expect(getNotificationPreferenceKey("SESSION_CANCELLED")).toBe("sessionUpdates");
    expect(getNotificationPreferenceKey("CORRECTION_REQUESTED")).toBe("correctionUpdates");
    expect(getNotificationPreferenceKey("CORRECTION_RESOLVED")).toBe("correctionUpdates");
    expect(getNotificationPreferenceKey("ATTENDANCE_ALERT")).toBe("attendanceAlerts");
    expect(getNotificationPreferenceKey("SYSTEM")).toBeUndefined();
  });

  it("active les catégories utiles par défaut", () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES).toEqual({
      sessionUpdates: true,
      correctionUpdates: true,
      attendanceAlerts: true,
    });
  });

  it("accepte uniquement les fournisseurs push attendus en HTTPS", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/example")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/example")).toBe(true);
    expect(isAllowedPushEndpoint("https://web.push.apple.com/example")).toBe(true);
    expect(isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/example")).toBe(false);
    expect(isAllowedPushEndpoint("https://presence-plus.example/api/internal")).toBe(false);
    expect(isAllowedPushEndpoint("not-a-url")).toBe(false);
  });
});
