"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { BellRing, CalendarClock, CheckCheck, LoaderCircle, MessageSquareMore, Smartphone, TriangleAlert } from "lucide-react";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  updateNotificationPreferencesAction,
} from "@/actions/notification.actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getBrowserPushSubscription, subscribeBrowserToPush, supportsWebPush } from "@/lib/web-push.client";
import type { NotificationCenterData, NotificationPreferences, NotificationSummary } from "@/types/notifications";

type PushState = "checking" | "unsupported" | "unconfigured" | "denied" | "disabled" | "enabled";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lubumbashi",
  }).format(new Date(value));
}

function iconFor(notification: NotificationSummary) {
  if (notification.kind.startsWith("SESSION_")) return <CalendarClock className="size-5 text-emerald-600" />;
  if (notification.kind.startsWith("CORRECTION_")) return <MessageSquareMore className="size-5 text-blue-600" />;
  return <BellRing className="size-5 text-amber-600" />;
}

export function NotificationSettings({
  initialData,
  initialPreferences,
  vapidPublicKey,
}: {
  initialData: NotificationCenterData;
  initialPreferences: NotificationPreferences;
  vapidPublicKey?: string;
}) {
  const [data, setData] = useState(initialData);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [pushState, setPushState] = useState<PushState>("checking");
  const [message, setMessage] = useState<{ text: string; error: boolean }>();
  const [platform, setPlatform] = useState({ ios: false, standalone: false });
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const platformCheck = window.setTimeout(() => setPlatform({
      ios: /iPad|iPhone|iPod/.test(navigator.userAgent),
      standalone: window.matchMedia("(display-mode: standalone)").matches,
    }), 0);
    async function inspect() {
      if (!vapidPublicKey) return setPushState("unconfigured");
      if (!supportsWebPush()) {
        return setPushState("unsupported");
      }
      if (Notification.permission === "denied") return setPushState("denied");
      const subscription = await getBrowserPushSubscription();
      setPushState(subscription ? "enabled" : "disabled");
    }
    void inspect();
    return () => window.clearTimeout(platformCheck);
  }, [vapidPublicKey]);

  function enablePush() {
    setMessage(undefined);
    startTransition(async () => {
      try {
        if (!vapidPublicKey) throw new Error("Le service push n’est pas encore configuré.");
        const subscription = await subscribeBrowserToPush(vapidPublicKey, true);
        const result = await savePushSubscriptionAction(subscription);
        if (!result.ok) throw new Error(result.message);
        setPushState("enabled");
        setMessage({ text: result.message, error: false });
      } catch (error) {
        setMessage({ text: error instanceof Error ? error.message : "Activation impossible.", error: true });
      }
    });
  }

  function disablePush() {
    setMessage(undefined);
    startTransition(async () => {
      try {
        const subscription = await getBrowserPushSubscription();
        if (subscription) {
          const result = await removePushSubscriptionAction(subscription.endpoint);
          if (!result.ok) throw new Error(result.message);
          await subscription.unsubscribe();
        }
        setPushState("disabled");
        setMessage({ text: "Notifications désactivées sur cet appareil.", error: false });
      } catch (error) {
        setMessage({ text: error instanceof Error ? error.message : "Désactivation impossible.", error: true });
      }
    });
  }

  function savePreferences() {
    setMessage(undefined);
    startTransition(async () => {
      const result = await updateNotificationPreferencesAction(preferences);
      setMessage({ text: result.message, error: !result.ok });
    });
  }

  function markRead(notification: NotificationSummary) {
    if (notification.readAt) return;
    setData((current) => ({
      unreadCount: Math.max(0, current.unreadCount - 1),
      notifications: current.notifications.map((item) => item.id === notification.id
        ? { ...item, readAt: new Date().toISOString() }
        : item),
    }));
    void markNotificationReadAction(notification.id);
  }

  function markAllRead() {
    startTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (result.ok) setData((current) => ({
        unreadCount: 0,
        notifications: current.notifications.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
      }));
    });
  }

  return (
    <div className="space-y-6">
      <section className="border bg-background">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="font-semibold">Boîte de réception</h2>
            <p className="mt-1 text-sm text-muted-foreground">Les informations restent disponibles même si le push est désactivé.</p>
          </div>
          <Button variant="outline" disabled={pending || data.unreadCount === 0} onClick={markAllRead}>
            <CheckCheck />Tout marquer comme lu
          </Button>
        </div>
        {data.notifications.length ? (
          <div className="divide-y">
            {data.notifications.map((notification) => (
              <Link
                href={notification.href}
                key={notification.id}
                onClick={() => markRead(notification)}
                className="flex min-h-20 gap-3 p-4 transition-colors hover:bg-muted/40 sm:px-6"
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  {iconFor(notification)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{notification.title}</span>
                    {!notification.readAt ? <Badge>Nouvelle</Badge> : null}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">{notification.body}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{formatDate(notification.createdAt)}</span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center sm:px-6">
            <CheckCheck className="mx-auto size-6 text-emerald-600" />
            <p className="mt-3 font-medium">Aucune notification</p>
            <p className="mt-1 text-sm text-muted-foreground">Les prochaines informations importantes apparaîtront ici.</p>
          </div>
        )}
      </section>

      <section className="border bg-background p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Smartphone className="mt-0.5 size-5 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-semibold">Notifications sur cet appareil</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Recevez les informations importantes même lorsque Presence Plus est fermé.</p>
              </div>
              {pushState === "enabled" ? (
                <Button variant="outline" onClick={disablePush} disabled={pending}>Désactiver</Button>
              ) : (
                <Button onClick={enablePush} disabled={pending || ["checking", "unsupported", "unconfigured", "denied"].includes(pushState)}>
                  {pending ? <LoaderCircle className="animate-spin" /> : <BellRing />}
                  Activer
                </Button>
              )}
            </div>
            <div className="mt-4" aria-live="polite">
              {pushState === "enabled" ? <Badge variant="secondary">Actives sur cet appareil</Badge> : null}
              {pushState === "denied" ? <Alert variant="destructive"><TriangleAlert /><AlertDescription>Les notifications sont bloquées dans les réglages du navigateur.</AlertDescription></Alert> : null}
              {pushState === "unsupported" ? <Alert><AlertDescription>Ce navigateur ou cette connexion ne prend pas en charge les notifications push.</AlertDescription></Alert> : null}
              {pushState === "unconfigured" ? <Alert><AlertDescription>Le service push doit encore être configuré par l’établissement.</AlertDescription></Alert> : null}
              {platform.ios && !platform.standalone ? <p className="mt-3 text-sm text-muted-foreground">Sur iPhone ou iPad, installez d’abord Presence Plus sur l’écran d’accueil.</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="border bg-background p-5 sm:p-6">
        <h2 className="font-semibold">Ce que je souhaite recevoir</h2>
        <div className="mt-5 divide-y">
          {([
            ["sessionUpdates", "Séances", "Planification, modification, démarrage et annulation."],
            ["correctionUpdates", "Corrections de présence", "Nouvelles demandes et décisions de l’enseignant."],
            ["attendanceAlerts", "Alertes de présence", "Informations importantes sur votre suivi de présence."],
          ] as const).map(([key, title, description]) => (
            <div key={key} className="flex min-h-20 items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div>
                <Label htmlFor={key}>{title}</Label>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
              </div>
              <Switch id={key} checked={preferences[key]} onCheckedChange={(checked) => setPreferences((current) => ({ ...current, [key]: checked }))} />
            </div>
          ))}
        </div>
        <Button className="mt-5" onClick={savePreferences} disabled={pending}>Enregistrer les préférences</Button>
      </section>

      <div aria-live="polite">
        {message ? <Alert variant={message.error ? "destructive" : "default"}><AlertDescription>{message.text}</AlertDescription></Alert> : null}
      </div>
    </div>
  );
}
