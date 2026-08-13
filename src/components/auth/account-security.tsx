"use client";

import { useState, useTransition } from "react";
import { Laptop, LoaderCircle, ShieldCheck, Smartphone } from "lucide-react";
import { revokeOwnSessionAction, revokeOwnSessionsAction } from "@/actions/auth.actions";
import { PasswordInput } from "@/components/auth/password-fields";
import { PasswordWorkflowForm } from "@/components/auth/password-workflow-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AuthSessionSummary } from "@/types/auth";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lubumbashi",
  }).format(new Date(value));
}

export function AccountSecurity({ initialSessions }: { initialSessions: AuthSessionSummary[] }) {
  const [sessions, setSessions] = useState(initialSessions);
  const [message, setMessage] = useState<{ text: string; error: boolean }>();
  const [pendingId, setPendingId] = useState<string>();
  const [sessionPassword, setSessionPassword] = useState("");
  const [pending, startTransition] = useTransition();

  function revoke(formData: FormData, sessionId?: string) {
    const currentPassword = String(formData.get("currentPassword") ?? "");
    setPendingId(sessionId ?? "all");
    startTransition(async () => {
      const result = sessionId
        ? await revokeOwnSessionAction(sessionId, currentPassword)
        : await revokeOwnSessionsAction(currentPassword);
      setMessage({ text: result.message, error: !result.ok });
      if (result.ok) {
        setSessions((current) => sessionId ? current.filter((item) => item.id !== sessionId) : current.filter((item) => item.current));
      }
      setPendingId(undefined);
    });
  }

  const otherSessions = sessions.filter((session) => !session.current);

  return (
    <div className="space-y-6">
      <section className="border bg-background p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Changer le mot de passe</h2>
        <p className="mt-1 text-sm text-muted-foreground">Le changement fermera toutes les connexions, y compris celle-ci.</p>
        <div className="mt-5 max-w-md"><PasswordWorkflowForm workflow="change" /></div>
      </section>

      <section className="border bg-background">
        <div className="flex items-start gap-3 border-b p-5 sm:p-6">
          <ShieldCheck className="mt-0.5 size-5 text-primary" />
          <div><h2 className="font-semibold">Appareils connectés</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Les sessions expirent automatiquement après huit heures.</p></div>
        </div>
        <div className="divide-y">
          {sessions.map((session) => (
            <div key={session.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-6">
              <span className="flex size-10 shrink-0 items-center justify-center bg-muted text-muted-foreground">
                {/Android|iPhone|iPad/i.test(session.deviceLabel) ? <Smartphone className="size-5" /> : <Laptop className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{session.deviceLabel}</p>{session.current ? <Badge>Session actuelle</Badge> : null}</div>
                <p className="mt-1 text-xs text-muted-foreground">Dernière activité : {formatDate(session.lastSeenAt)} · expiration : {formatDate(session.expiresAt)}</p>
              </div>
              {!session.current ? (
                <form action={(formData) => revoke(formData, session.id)} className="flex w-full gap-2 sm:w-auto">
                  <input type="hidden" name="currentPassword" value={sessionPassword} />
                  <Button variant="outline" disabled={pending || !sessionPassword} className="w-full sm:w-auto">{pendingId === session.id ? <><LoaderCircle className="animate-spin" />Révocation...</> : "Révoquer"}</Button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
        {!sessions.length ? <p className="p-6 text-sm text-muted-foreground">Aucune session active n’a été trouvée.</p> : null}
        <form action={(formData) => revoke(formData)} className="space-y-3 border-t bg-muted/20 p-5 sm:p-6">
          <div className="max-w-md"><PasswordInput id="sessions-current-password" name="currentPassword" label="Mot de passe actuel" autoComplete="current-password" disabled={pending} onValueChange={setSessionPassword} /></div>
          <div aria-live="polite">{message ? <Alert variant={message.error ? "destructive" : "default"}><AlertDescription>{message.text}</AlertDescription></Alert> : null}</div>
          <Button variant="outline" disabled={pending || !otherSessions.length || !sessionPassword}>{pendingId === "all" ? <><LoaderCircle className="animate-spin" />Révocation...</> : "Révoquer toutes les autres sessions"}</Button>
        </form>
      </section>
    </div>
  );
}
