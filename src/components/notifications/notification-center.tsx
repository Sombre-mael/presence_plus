"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Bell, CalendarClock, CheckCheck, MessageSquareMore } from "lucide-react";
import type { AdminAnomaly } from "@/types/admin";
import type { NotificationCenterData, NotificationSummary } from "@/types/notifications";
import { markNotificationReadAction } from "@/actions/notification.actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function NotificationIcon({ notification }: { notification: NotificationSummary }) {
  if (notification.kind.startsWith("CORRECTION_")) return <MessageSquareMore className="text-blue-600" />;
  if (notification.kind.startsWith("SESSION_")) return <CalendarClock className="text-emerald-600" />;
  return <Bell className="text-amber-600" />;
}

export function NotificationCenter({ anomalies }: { anomalies: AdminAnomaly[] }) {
  const [data, setData] = useState<NotificationCenterData>({ notifications: [], unreadCount: 0 });

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (response.ok) setData(await response.json() as NotificationCenterData);
    } catch {
      // Keep the last successful state when the network is temporarily unavailable.
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      window.clearTimeout(initialRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [refresh]);

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

  const displayedNotifications = data.notifications.slice(0, 5);
  const unreadHrefs = new Set(displayedNotifications
    .filter((notification) => !notification.readAt)
    .map((notification) => notification.href));
  const displayedAnomalies = anomalies
    .filter((anomaly) => !unreadHrefs.has(anomaly.href))
    .slice(0, 2);
  const totalAttention = data.unreadCount + displayedAnomalies.length;

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) void refresh(); }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`${totalAttention} élément${totalAttention === 1 ? "" : "s"} à consulter`}>
          <Bell />
          {totalAttention > 0 ? (
            <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-4 text-white">
              {totalAttention > 9 ? "9+" : totalAttention}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(380px,calc(100vw-1rem))]">
        <DropdownMenuLabel className="flex items-center justify-between gap-3">
          <span>Notifications</span>
          <span className="text-xs font-normal text-muted-foreground">{data.unreadCount} non lue{data.unreadCount === 1 ? "" : "s"}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!displayedNotifications.length && !anomalies.length ? (
          <div className="px-4 py-8 text-center">
            <CheckCheck className="mx-auto size-5 text-emerald-600" />
            <p className="mt-2 text-sm font-medium">Vous êtes à jour</p>
            <p className="mt-1 text-xs text-muted-foreground">Les nouvelles informations apparaîtront ici.</p>
          </div>
        ) : null}
        {displayedNotifications.map((notification) => (
          <DropdownMenuItem asChild key={notification.id} className="items-start gap-3 py-3">
            <Link href={notification.href} onClick={() => markRead(notification)}>
              <NotificationIcon notification={notification} />
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-medium">
                  {!notification.readAt ? <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Non lue" /> : null}
                  <span className="truncate">{notification.title}</span>
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{notification.body}</span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
        {displayedAnomalies.map((anomaly) => (
          <DropdownMenuItem asChild key={anomaly.id} className="items-start gap-3 py-3">
            <Link href={anomaly.href}>
              <AlertTriangle className={anomaly.severity === "HIGH" ? "text-red-600" : "text-amber-600"} />
              <span>
                <span className="block font-medium">{anomaly.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{anomaly.detail}</span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/notifications">Voir et configurer les notifications</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
