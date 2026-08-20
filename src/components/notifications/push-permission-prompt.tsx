"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BellRing, LoaderCircle } from "lucide-react";
import { savePushSubscriptionAction } from "@/actions/notification.actions";
import { Button } from "@/components/ui/button";
import { subscribeBrowserToPush, supportsWebPush } from "@/lib/web-push.client";

const SNOOZE_KEY = "presence-plus:push-prompt:snooze-until";
const SNOOZE_DURATION = 7 * 24 * 60 * 60_000;

export function PushPermissionPrompt({ vapidPublicKey }: { vapidPublicKey?: string }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const initialCheck = window.setTimeout(async () => {
      if (!vapidPublicKey || !supportsWebPush() || Notification.permission === "denied") return;
      const snoozedUntil = Number(window.localStorage.getItem(SNOOZE_KEY) ?? 0);
      if (snoozedUntil > Date.now()) return;

      if (Notification.permission === "granted") {
        try {
          const subscription = await subscribeBrowserToPush(vapidPublicKey, false);
          const result = await savePushSubscriptionAction(subscription);
          if (!result.ok) throw new Error(result.message);
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Activation impossible.");
          setVisible(true);
        }
        return;
      }
      setVisible(true);
    }, 0);
    return () => window.clearTimeout(initialCheck);
  }, [vapidPublicKey]);

  function activate() {
    setMessage(undefined);
    startTransition(async () => {
      try {
        if (!vapidPublicKey) throw new Error("Le service de notifications n’est pas disponible.");
        const subscription = await subscribeBrowserToPush(vapidPublicKey, true);
        const result = await savePushSubscriptionAction(subscription);
        if (!result.ok) throw new Error(result.message);
        window.localStorage.removeItem(SNOOZE_KEY);
        setVisible(false);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Activation impossible.");
      }
    });
  }

  function snooze() {
    window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DURATION));
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible ? (
        <motion.aside
          aria-labelledby="push-permission-title"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 rounded-lg border bg-background p-4 shadow-xl sm:left-auto sm:right-6 sm:w-full sm:max-w-sm"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <BellRing className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 id="push-permission-title" className="font-semibold">Recevez les informations importantes</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Recevez les changements de séance, ouvertures de pointage et décisions de correction, même lorsque l’application est fermée.
              </p>
            </div>
          </div>
          {message ? (
            <p className="mt-3 text-sm text-destructive" role="alert">{message} <Link href="/account/notifications" className="underline">Voir les réglages</Link></p>
          ) : null}
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" className="min-h-11" onClick={snooze} disabled={pending}>Plus tard</Button>
            <Button className="min-h-11" onClick={activate} disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" /> : <BellRing />}
              Activer les notifications
            </Button>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
