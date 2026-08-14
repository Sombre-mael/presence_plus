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
`;

  return new Response(worker, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
