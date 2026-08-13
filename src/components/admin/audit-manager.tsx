"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, FileClock, Search } from "lucide-react";
import { useAdminData } from "@/components/admin/admin-data-provider";
import { loadAdminAuditLogsAction } from "@/actions/academic.actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminAuditLog } from "@/types/admin";

const actionLabels: Record<string, string> = {
  CREATE_USER: "Création d’un utilisateur",
  UPDATE_USER: "Modification d’un utilisateur",
  DELETE_USER: "Suppression d’un utilisateur",
  ACTIVATE_USER: "Activation d’un compte",
  DEACTIVATE_USER: "Désactivation d’un compte",
  CREATE_PROMOTION: "Création d’une promotion",
  UPDATE_PROMOTION: "Modification d’une promotion",
  DELETE_PROMOTION: "Suppression d’une promotion",
  CREATE_COURSE: "Création d’un cours",
  UPDATE_COURSE: "Modification d’un cours",
  DELETE_COURSE: "Suppression d’un cours",
  ACTIVATE_COURSE: "Activation d’un cours",
  DEACTIVATE_COURSE: "Désactivation d’un cours",
  CREATE_SESSION: "Création d’une session",
  UPDATE_SESSION: "Modification d’une session",
  START_SESSION: "Démarrage d’une session",
  CANCEL_SESSION: "Annulation d’une session",
  AUTO_CANCEL_SESSION: "Annulation automatique d’une session",
  COMPLETE_SESSION: "Clôture d’une session",
  CREATE_ATTENDANCE: "Saisie d’une présence",
  CORRECT_ATTENDANCE: "Correction d’une présence",
  STUDENT_CHECK_IN: "Pointage étudiant",
  CREATE_CORRECTION_REQUEST: "Demande de correction créée",
  CANCEL_CORRECTION_REQUEST: "Demande de correction annulée",
  APPROVE_CORRECTION_REQUEST: "Correction acceptée",
  REJECT_CORRECTION_REQUEST: "Correction refusée",
  EXPORT_STATISTICS: "Export des statistiques",
  EXPORT_ATTENDANCES: "Export des présences",
  LOGIN_SUCCESS: "Connexion réussie",
  LOGOUT: "Déconnexion",
  REQUEST_PASSWORD_RESET: "Réinitialisation demandée",
  RESET_PASSWORD: "Mot de passe réinitialisé",
  CHANGE_PASSWORD: "Mot de passe modifié",
  ACTIVATE_ACCOUNT: "Compte activé",
  SEND_INVITATION: "Invitation créée",
  RESEND_INVITATION: "Invitation renouvelée",
  SEND_PASSWORD_RESET: "Réinitialisation préparée",
  REVOKE_SESSION: "Session révoquée",
  REVOKE_OTHER_SESSIONS: "Autres sessions révoquées",
  REVOKE_USER_SESSIONS: "Sessions utilisateur révoquées",
  AUTH_THROTTLE_BLOCK: "Tentatives temporairement bloquées",
  AUTH_EMAIL_NOT_APPLICABLE: "Envoi e-mail non applicable",
  AUTH_EMAIL_SIMULATED: "Code remis directement",
  OPERATOR_PASSWORD_RESET_CODE: "Code de récupération opérateur",
  AUTH_EMAIL_ACCEPTED: "E-mail accepté par le service",
  AUTH_EMAIL_FAILED: "Échec de l’envoi e-mail",
  BOOTSTRAP_ADMIN: "Premier administrateur créé",
};

const entityLabels: Record<string, string> = {
  User: "Utilisateur",
  Promotion: "Promotion",
  Course: "Cours",
  Session: "Session",
  Attendance: "Présence",
  AttendanceCorrectionRequest: "Demande de correction",
  AuthSession: "Session de connexion",
  AuthToken: "Jeton d’accès",
  AuthThrottle: "Protection anti-abus",
};

export function AuditManager() {
  const { state } = useAdminData();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const deferredQuery = useDeferredValue(query);
  const actor = searchParams.get("actor") ?? "ALL";
  const action = searchParams.get("action") ?? "ALL";
  const entity = searchParams.get("entity") ?? "ALL";
  const date = searchParams.get("date") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const [logs, setLogs] = useState<AdminAuditLog[]>(state.auditLogs.slice(0, 25));
  const [total, setTotal] = useState(state.auditLogs.length);
  const [loading, startLoading] = useTransition();
  const [error, setError] = useState("");

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "ALL") params.delete(key); else params.set(key, value);
    if (key !== "page") params.delete("page");
    router.replace(`/admin/audit${params.size ? `?${params}` : ""}`, { scroll: false });
  }

  useEffect(() => {
    let active = true;
    startLoading(async () => {
      try {
        const result = await loadAdminAuditLogsAction({
          query: deferredQuery,
          actorId: actor === "ALL" ? undefined : actor,
          action: action === "ALL" ? undefined : action,
          entityType: entity === "ALL" ? undefined : entity,
          date: date || undefined,
          page,
          pageSize: 25,
        });
        if (!active) return;
        setLogs(result.items);
        setTotal(result.total);
        setError("");
      } catch {
        if (active) setError("Le journal n’a pas pu être chargé depuis Neon.");
      }
    });
    return () => { active = false; };
  }, [action, actor, date, deferredQuery, entity, page]);

  const actors: Array<[string, string]> = [
    ["SYSTEM", "Système"],
    ...state.users.map((user) => [user.id, user.name] as [string, string]),
  ];
  const actions = Object.entries(actionLabels).sort((a, b) => a[1].localeCompare(b[1], "fr"));
  const entities = Object.entries(entityLabels).sort((a, b) => a[1].localeCompare(b[1], "fr"));
  const pageCount = Math.max(1, Math.ceil(total / 25));

  return (
    <div>
      <PageHeader title="Journal d’activité" description={`${total} opération${total > 1 ? "s" : ""} confirmée${total > 1 ? "s" : ""} par Neon.`} />
      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="border bg-background">
        <div className="grid gap-2 border-b p-4 md:grid-cols-[minmax(220px,1fr)_180px_210px_170px_170px]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => { setQuery(event.target.value); update("q", event.target.value); }} placeholder="Acteur ou identifiant..." className="pl-9" /></div>
          <Filter value={actor} label="Tous les acteurs" values={actors} onChange={(value) => update("actor", value)} />
          <Filter value={action} label="Toutes les actions" values={actions} onChange={(value) => update("action", value)} />
          <Filter value={entity} label="Toutes les entités" values={entities} onChange={(value) => update("entity", value)} />
          <Input type="date" value={date} onChange={(event) => update("date", event.target.value)} aria-label="Filtrer par date" />
        </div>
        <div className={`hidden md:block ${loading ? "opacity-60" : ""}`}><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Acteur</TableHead><TableHead>Action</TableHead><TableHead>Entité</TableHead><TableHead>Identifiant</TableHead></TableRow></TableHeader><TableBody>{logs.map((log) => <TableRow key={log.id}><TableCell className="whitespace-nowrap text-xs">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Lubumbashi" }).format(new Date(log.createdAt))}</TableCell><TableCell>{log.actorName}</TableCell><TableCell className="font-medium">{actionLabels[log.action] ?? log.action}</TableCell><TableCell>{entityLabels[log.entityType] ?? log.entityType}</TableCell><TableCell className="max-w-48 truncate font-mono text-xs">{log.entityId}</TableCell></TableRow>)}</TableBody></Table></div>
        <div className={`divide-y md:hidden ${loading ? "opacity-60" : ""}`}>{logs.map((log) => <div key={log.id} className="flex gap-3 p-4"><span className="flex size-9 shrink-0 items-center justify-center bg-muted"><FileClock className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-medium">{actionLabels[log.action] ?? log.action}</p><p className="mt-1 truncate text-xs text-muted-foreground">{log.actorName} · {entityLabels[log.entityType] ?? log.entityType}</p><p className="mt-1 text-[11px] text-muted-foreground">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Lubumbashi" }).format(new Date(log.createdAt))}</p></div></div>)}</div>
        {!logs.length && !loading && <div className="p-10 text-center"><FileClock className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Aucune opération trouvée</p><p className="mt-1 text-xs text-muted-foreground">Modifiez les filtres pour élargir la recherche.</p></div>}
        <div className="flex items-center justify-between gap-3 border-t p-3">
          <p className="text-xs text-muted-foreground">Page {Math.min(page, pageCount)} sur {pageCount}</p>
          <div className="flex gap-1">
            <Button variant="outline" size="icon-sm" disabled={loading || page <= 1} onClick={() => update("page", String(page - 1))} aria-label="Page précédente"><ChevronLeft /></Button>
            <Button variant="outline" size="icon-sm" disabled={loading || page >= pageCount} onClick={() => update("page", String(page + 1))} aria-label="Page suivante"><ChevronRight /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Filter({ value, label, values, onChange }: { value: string; label: string; values: Array<[string, string]>; onChange: (value: string) => void }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">{label}</SelectItem>{values.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select>;
}
