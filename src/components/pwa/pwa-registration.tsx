"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const UPDATE_INTERVAL_MS = 5 * 60_000;

export function PwaRegistration({ currentVersion }: { currentVersion: string }) {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const reloadingRef = useRef(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator) || !window.isSecureContext) return;

    let active = true;
    let updateWorker: ServiceWorker | null = null;

    function markUpdate(worker: ServiceWorker | null) {
      if (!active || !worker) return;
      waitingWorkerRef.current = worker;
      setUpdateAvailable(true);
    }

    function watchInstallingWorker(registration: ServiceWorkerRegistration) {
      updateWorker = registration.installing;
      if (!updateWorker) return;
      updateWorker.addEventListener("statechange", () => {
        if (updateWorker?.state === "installed" && navigator.serviceWorker.controller) {
          markUpdate(registration.waiting ?? updateWorker);
        }
      });
    }

    async function checkForUpdate() {
      const registration = registrationRef.current;
      if (!registration) return;
      try {
        const response = await fetch("/api/version", { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
        if (!response.ok) return;
        const data = await response.json() as { version?: string };
        if (data.version && data.version !== currentVersion) await registration.update();
        markUpdate(registration.waiting);
      } catch {
        // A temporary network failure must not interrupt the current application.
      }
    }

    function handleControllerChange() {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    }

    function handleForeground() {
      if (document.visibilityState === "visible") void checkForUpdate();
    }

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then((registration) => {
      if (!active) return;
      registrationRef.current = registration;
      registration.addEventListener("updatefound", () => watchInstallingWorker(registration));
      markUpdate(registration.waiting);
      void checkForUpdate();
    }).catch(() => undefined);

    document.addEventListener("visibilitychange", handleForeground);
    window.addEventListener("online", checkForUpdate);
    const interval = window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS);

    return () => {
      active = false;
      updateWorker = null;
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      document.removeEventListener("visibilitychange", handleForeground);
      window.removeEventListener("online", checkForUpdate);
      window.clearInterval(interval);
    };
  }, [currentVersion]);

  async function applyUpdate() {
    setApplying(true);
    const registration = registrationRef.current;
    if (!registration) {
      window.location.reload();
      return;
    }

    try {
      await registration.update();
      const waiting = registration.waiting ?? waitingWorkerRef.current;
      if (waiting) {
        waiting.postMessage({ type: "SKIP_WAITING" });
      } else {
        window.location.reload();
      }
    } catch {
      setApplying(false);
    }
  }

  if (!updateAvailable) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[100] mx-auto flex max-w-xl items-center gap-3 border border-emerald-200 bg-background p-3 shadow-lg sm:inset-x-auto sm:right-4 sm:bottom-4" role="status" aria-live="polite">
      <span className="flex size-9 shrink-0 items-center justify-center bg-emerald-100 text-emerald-700" aria-hidden="true">
        <RefreshCw className="size-4 motion-safe:animate-spin [animation-duration:3s]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Mise à jour disponible</p>
        <p className="text-xs text-muted-foreground">La nouvelle version est prête.</p>
      </div>
      <Button size="sm" onClick={applyUpdate} disabled={applying}>
        {applying ? "Mise à jour…" : "Mettre à jour"}
      </Button>
    </div>
  );
}
