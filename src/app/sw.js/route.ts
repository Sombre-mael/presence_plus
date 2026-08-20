import { getAppVersion } from "@/lib/app-version";

export const dynamic = "force-dynamic";

export async function GET() {
  const version = JSON.stringify(getAppVersion());
  const worker = `
const APP_VERSION = ${version};
const OWNED_CACHE_PREFIX = "presence-plus-";

self.addEventListener("install", () => {
  // A new worker waits until the user explicitly applies the update.
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith(OWNED_CACHE_PREFIX))
        .map((name) => caches.delete(name)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "GET_VERSION") {
    event.source?.postMessage({ type: "APP_VERSION", version: APP_VERSION });
  }
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = {};
  }
  const href = typeof payload.href === "string" && payload.href.startsWith("/")
    ? payload.href
    : "/dashboard";
  event.waitUntil(self.registration.showNotification(
    typeof payload.title === "string" ? payload.title : "Presence Plus",
    {
      body: typeof payload.body === "string" ? payload.body : "Une nouvelle information est disponible.",
      icon: "/icons/pwa-192.png",
      badge: "/icons/pwa-192.png",
      tag: typeof payload.tag === "string" ? payload.tag : "presence-plus",
      data: { href },
    },
  ));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = typeof event.notification.data?.href === "string" && event.notification.data.href.startsWith("/")
    ? event.notification.data.href
    : "/dashboard";
  const targetUrl = new URL(href, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const visibleWindow = windows.find((client) => "focus" in client);
    if (visibleWindow) {
      if ("navigate" in visibleWindow) await visibleWindow.navigate(targetUrl);
      return visibleWindow.focus();
    }
    return self.clients.openWindow(targetUrl);
  })());
});
`;

  return new Response(worker, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
