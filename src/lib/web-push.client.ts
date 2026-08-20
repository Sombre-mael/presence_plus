import type { BrowserPushSubscriptionInput } from "@/types/notifications";

export function supportsWebPush() {
  return typeof window !== "undefined"
    && window.isSecureContext
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = window.atob(base64);
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

export async function getBrowserPushSubscription() {
  if (!supportsWebPush()) return undefined;
  const registration = await navigator.serviceWorker.getRegistration("/");
  return registration?.pushManager.getSubscription();
}

export async function subscribeBrowserToPush(
  vapidPublicKey: string,
  requestPermission: boolean,
): Promise<BrowserPushSubscriptionInput> {
  if (!supportsWebPush()) throw new Error("Ce navigateur ne prend pas en charge les notifications push.");
  let permission = Notification.permission;
  if (permission === "default" && requestPermission) {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") throw new Error("L’autorisation n’a pas été accordée.");

  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  const subscription = await registration.pushManager.getSubscription()
    ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(vapidPublicKey),
    });
  const serialized = subscription.toJSON();
  if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) {
    throw new Error("Le navigateur n’a pas retourné un abonnement complet.");
  }
  return {
    endpoint: serialized.endpoint,
    expirationTime: serialized.expirationTime,
    keys: { p256dh: serialized.keys.p256dh, auth: serialized.keys.auth },
  };
}
