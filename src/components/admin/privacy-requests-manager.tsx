"use client";

import { useMemo, useState, useTransition } from "react";
import { LoaderCircle, Search, ShieldAlert } from "lucide-react";
import { resolveDataSubjectRequestAction } from "@/actions/legal.actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AdminLevel } from "@/types";
import type { AdminPrivacyRequestSummary } from "@/types/privacy";

const typeLabels = { ACCESS: "Accès", RECTIFICATION: "Rectification", EXPORT: "Export", OBJECTION: "Opposition", DELETION: "Suppression" } as const;
const statusLabels = { PENDING: "En attente", IN_REVIEW: "En cours", COMPLETED: "Traitée", REJECTED: "Refusée", CANCELLED: "Annulée" } as const;

export function PrivacyRequestsManager({ initialItems, adminLevel }: { initialItems: AdminPrivacyRequestSummary[]; adminLevel?: AdminLevel }) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [selectedId, setSelectedId] = useState(initialItems.find((item) => ["PENDING", "IN_REVIEW"].includes(item.status))?.id);
  const [decision, setDecision] = useState<"IN_REVIEW" | "COMPLETED" | "REJECTED">("IN_REVIEW");
  const [responseMessage, setResponseMessage] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean }>();
  const [pending, startTransition] = useTransition();
  const visible = useMemo(() => items.filter((item) => {
    const matchQuery = `${item.userName} ${item.userEmail} ${item.details ?? ""}`.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr"));
    const matchStatus = status === "ALL" || (status === "OPEN" ? ["PENDING", "IN_REVIEW"].includes(item.status) : item.status === status);
    return matchQuery && matchStatus;
  }), [items, query, status]);
  const selected = items.find((item) => item.id === selectedId);
  const restricted = Boolean(selected && ["OBJECTION", "DELETION"].includes(selected.type) && adminLevel !== "SUPER");

  function submit() {
    if (!selected) return;
    setMessage(undefined);
    startTransition(async () => {
      const result = await resolveDataSubjectRequestAction({ requestId: selected.id, status: decision, responseMessage });
      setMessage({ text: result.message, error: !result.ok });
      if (!result.ok || !result.value) return;
      setItems((current) => current.map((item) => item.id === selected.id ? { ...item, ...result.value } : item));
      setResponseMessage("");
    });
  }

  return (
    <div>
      <PageHeader title="Demandes relatives aux données" description="Traitez les demandes des utilisateurs avec une décision explicite et une trace d’audit." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
        <section className="border bg-background">
          <div className="grid gap-3 border-b p-4 sm:grid-cols-[1fr_180px]"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un utilisateur" className="h-11 pl-9" /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="OPEN">À traiter</SelectItem><SelectItem value="ALL">Toutes</SelectItem><SelectItem value="PENDING">En attente</SelectItem><SelectItem value="IN_REVIEW">En cours</SelectItem><SelectItem value="COMPLETED">Traitées</SelectItem><SelectItem value="REJECTED">Refusées</SelectItem><SelectItem value="CANCELLED">Annulées</SelectItem></SelectContent></Select></div>
          <div className="divide-y">{visible.map((item) => <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setMessage(undefined); }} className={`block w-full p-4 text-left transition-colors hover:bg-muted/50 ${selectedId === item.id ? "bg-emerald-50" : ""}`}><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{item.userName}</span><Badge variant="outline">{typeLabels[item.type]}</Badge><Badge variant={item.status === "REJECTED" ? "destructive" : item.status === "COMPLETED" ? "default" : "secondary"}>{statusLabels[item.status]}</Badge></div><p className="mt-1 break-all text-xs text-muted-foreground">{item.userEmail} · {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Africa/Lubumbashi" }).format(new Date(item.createdAt))}</p></button>)}{!visible.length ? <p className="p-8 text-center text-sm text-muted-foreground">Aucune demande ne correspond aux filtres.</p> : null}</div>
        </section>
        <aside className="h-fit border bg-background p-5 lg:sticky lg:top-24">
          {selected ? <><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{typeLabels[selected.type]} · {selected.userName}</h2><Badge variant="secondary">{statusLabels[selected.status]}</Badge></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{selected.details || "Aucune précision fournie."}</p>{selected.responseMessage ? <div className="mt-4 border-l-2 border-primary bg-muted/40 p-3 text-sm"><p className="font-medium">Réponse actuelle</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{selected.responseMessage}</p></div> : null}{restricted ? <Alert className="mt-4"><ShieldAlert /><AlertDescription>Les demandes d’opposition et de suppression sont réservées au super administrateur.</AlertDescription></Alert> : null}{message ? <Alert className="mt-4" variant={message.error ? "destructive" : "default"}><AlertDescription>{message.text}</AlertDescription></Alert> : null}{["PENDING", "IN_REVIEW"].includes(selected.status) ? <div className="mt-5 space-y-4"><div className="space-y-2"><Label htmlFor="privacy-decision">Décision</Label><Select value={decision} onValueChange={(value) => setDecision(value as typeof decision)} disabled={restricted}><SelectTrigger id="privacy-decision" className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="IN_REVIEW">Passer en cours d’examen</SelectItem><SelectItem value="COMPLETED">Marquer comme traitée</SelectItem><SelectItem value="REJECTED">Refuser avec explication</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="privacy-response">Réponse à l’utilisateur</Label><Textarea id="privacy-response" value={responseMessage} onChange={(event) => setResponseMessage(event.target.value)} maxLength={2000} disabled={restricted || pending} /></div><Button className="w-full" disabled={restricted || pending || (["COMPLETED", "REJECTED"].includes(decision) && responseMessage.trim().length < 10)} onClick={submit}>{pending ? <LoaderCircle className="animate-spin" /> : null}{pending ? "Enregistrement..." : "Enregistrer le suivi"}</Button></div> : null}</> : <p className="text-sm text-muted-foreground">Sélectionnez une demande pour consulter son détail.</p>}
        </aside>
      </div>
    </div>
  );
}
