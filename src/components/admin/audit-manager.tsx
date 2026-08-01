"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileClock, Search } from "lucide-react";
import { useAdminData } from "@/components/admin/admin-data-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function AuditManager() {
  const { state } = useAdminData();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const actor = searchParams.get("actor") ?? "ALL";
  const action = searchParams.get("action") ?? "ALL";
  const entity = searchParams.get("entity") ?? "ALL";
  const date = searchParams.get("date") ?? "";
  const logs = state.auditLogs;

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "ALL") params.delete(key); else params.set(key, value);
    router.replace(`/admin/audit${params.size ? `?${params}` : ""}`, { scroll: false });
  }

  const filtered = useMemo(() => logs.filter((log) => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return (!normalized || `${log.actorName} ${log.action} ${log.entityType} ${log.entityId}`.toLocaleLowerCase("fr").includes(normalized)) &&
      (actor === "ALL" || log.actorId === actor) &&
      (action === "ALL" || log.action === action) &&
      (entity === "ALL" || log.entityType === entity) &&
      (!date || log.createdAt.startsWith(date));
  }), [action, actor, date, entity, logs, query]);

  const actors = Array.from(new Map(logs.map((log) => [log.actorId, log.actorName])).entries());
  const actions = Array.from(new Set(logs.map((log) => log.action))).sort();
  const entities = Array.from(new Set(logs.map((log) => log.entityType))).sort();

  return (
    <div>
      <PageHeader title="Journal d’activité" description="Consultez les opérations confirmées par Neon et leur auteur." />
      <div className="border bg-background">
        <div className="grid gap-2 border-b p-4 md:grid-cols-[minmax(220px,1fr)_180px_210px_170px_170px]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => { setQuery(event.target.value); update("q", event.target.value); }} placeholder="Action, acteur ou identifiant..." className="pl-9" /></div>
          <Filter value={actor} label="Tous les acteurs" values={actors} onChange={(value) => update("actor", value)} />
          <Filter value={action} label="Toutes les actions" values={actions.map((value) => [value, value])} onChange={(value) => update("action", value)} />
          <Filter value={entity} label="Toutes les entités" values={entities.map((value) => [value, value])} onChange={(value) => update("entity", value)} />
          <Input type="date" value={date} onChange={(event) => update("date", event.target.value)} aria-label="Filtrer par date" />
        </div>
        <div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Acteur</TableHead><TableHead>Action</TableHead><TableHead>Entité</TableHead><TableHead>Identifiant</TableHead></TableRow></TableHeader><TableBody>{filtered.map((log) => <TableRow key={log.id}><TableCell className="whitespace-nowrap text-xs">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Lubumbashi" }).format(new Date(log.createdAt))}</TableCell><TableCell>{log.actorName}</TableCell><TableCell className="font-medium">{log.action}</TableCell><TableCell>{log.entityType}</TableCell><TableCell className="max-w-48 truncate font-mono text-xs">{log.entityId}</TableCell></TableRow>)}</TableBody></Table></div>
        <div className="divide-y md:hidden">{filtered.map((log) => <div key={log.id} className="flex gap-3 p-4"><span className="flex size-9 shrink-0 items-center justify-center bg-muted"><FileClock className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-medium">{log.action}</p><p className="mt-1 truncate text-xs text-muted-foreground">{log.actorName} · {log.entityType}</p><p className="mt-1 text-[11px] text-muted-foreground">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Lubumbashi" }).format(new Date(log.createdAt))}</p></div></div>)}</div>
        {!filtered.length && <div className="p-10 text-center"><FileClock className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Aucune opération trouvée</p><p className="mt-1 text-xs text-muted-foreground">Modifiez les filtres pour élargir la recherche.</p></div>}
      </div>
    </div>
  );
}

function Filter({ value, label, values, onChange }: { value: string; label: string; values: Array<[string, string]>; onChange: (value: string) => void }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">{label}</SelectItem>{values.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select>;
}
