"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, FileCheck2, LoaderCircle, Send, ShieldCheck, X } from "lucide-react";
import {
  cancelDataSubjectRequestAction,
  createDataSubjectRequestAction,
} from "@/actions/legal.actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DataSubjectRequestSummary, PrivacyDashboardData } from "@/types/privacy";

const typeLabels = {
  ACCESS: "Accéder à mes données",
  RECTIFICATION: "Rectifier une information",
  EXPORT: "Obtenir un export",
  OBJECTION: "M’opposer à un traitement",
  DELETION: "Demander une suppression",
} as const;

const statusLabels = {
  PENDING: "En attente",
  IN_REVIEW: "En cours",
  COMPLETED: "Traitée",
  REJECTED: "Refusée",
  CANCELLED: "Annulée",
} as const;

export function PrivacyCenter({ initialData }: { initialData: PrivacyDashboardData }) {
  const [requests, setRequests] = useState(initialData.requests);
  const [type, setType] = useState<keyof typeof typeLabels>("ACCESS");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean }>();
  const [fieldError, setFieldError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const inventory = useMemo(() => [
    ["Présences", initialData.inventory.attendanceCount],
    ["Séances liées", initialData.inventory.sessionCount],
    ["Corrections", initialData.inventory.correctionCount],
    ["Notifications", initialData.inventory.notificationCount],
    ["Sessions actives", initialData.inventory.activeSessionCount],
    ["Photos soumises", initialData.inventory.photoSubmissionCount],
  ] as const, [initialData.inventory]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    setFieldError(undefined);
    startTransition(async () => {
      const response = await createDataSubjectRequestAction(type, details);
      setMessage({ text: response.message, error: !response.ok });
      setFieldError(response.fieldErrors?.details);
      if (!response.ok || !response.value) return;
      setRequests((current) => [response.value!, ...current]);
      setDetails("");
    });
  }

  function cancel(request: DataSubjectRequestSummary) {
    setMessage(undefined);
    startTransition(async () => {
      const response = await cancelDataSubjectRequestAction(request.id);
      setMessage({ text: response.message, error: !response.ok });
      if (response.ok) setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status: "CANCELLED", resolvedAt: new Date().toISOString() } : item));
    });
  }

  return (
    <div className="space-y-6">
      <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950"><ShieldCheck /><AlertTitle>Vos informations restent sous votre contrôle</AlertTitle><AlertDescription>L’établissement traite vos demandes. Presence Plus fournit la traçabilité et les outils techniques nécessaires.</AlertDescription></Alert>

      <section className="border bg-background">
        <div className="border-b p-5"><h2 className="font-semibold">Données associées à votre compte</h2><p className="mt-1 text-sm text-muted-foreground">Inventaire actuel, sans exposer vos secrets de connexion.</p></div>
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
          {inventory.map(([label, count]) => <div key={label} className="bg-background p-4"><p className="text-2xl font-semibold">{count}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="border bg-background p-5"><h2 className="font-semibold">Pourquoi ces données ?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Elles servent à sécuriser votre compte, établir les présences, traiter les corrections, vous informer et assurer la traçabilité des opérations.</p></div>
        <div className="border bg-background p-5"><h2 className="font-semibold">Combien de temps ?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Les données académiques sont conservées {initialData.configuration.academicRetentionMonths / 12} ans. Les journaux d’audit sont conservés {initialData.configuration.auditRetentionMonths} mois. Les données techniques ont des durées plus courtes détaillées dans la politique de confidentialité.</p></div>
      </section>

      <section className="border bg-background">
        <div className="border-b p-5"><h2 className="font-semibold">Exercer un droit</h2><p className="mt-1 text-sm text-muted-foreground">Une demande de suppression ne peut pas effacer immédiatement un historique académique encore soumis à sa durée de conservation.</p></div>
        <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="privacy-request-type">Type de demande</Label><Select value={type} onValueChange={(value) => setType(value as keyof typeof typeLabels)}><SelectTrigger id="privacy-request-type" className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(typeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="privacy-request-details">Précisions</Label><Textarea id="privacy-request-details" value={details} onChange={(event) => setDetails(event.target.value)} placeholder={type === "RECTIFICATION" ? "Indiquez l’information à corriger et la valeur exacte attendue." : "Ajoutez les éléments utiles au traitement de votre demande."} maxLength={2000} aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? "privacy-request-error" : "privacy-request-help"} /><p id={fieldError ? "privacy-request-error" : "privacy-request-help"} className={fieldError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{fieldError ?? "Les demandes de rectification, opposition et suppression nécessitent une explication."}</p></div>
          {message ? <Alert variant={message.error ? "destructive" : "default"} className="sm:col-span-2"><AlertDescription>{message.text}</AlertDescription></Alert> : null}
          <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Send />}{pending ? "Transmission..." : "Transmettre la demande"}</Button></div>
        </form>
      </section>

      <section className="border bg-background">
        <div className="border-b p-5"><h2 className="font-semibold">Suivi de mes demandes</h2></div>
        {requests.length ? <div className="divide-y">{requests.map((request) => (
          <article key={request.id} className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{typeLabels[request.type]}</h3><Badge variant={request.status === "REJECTED" ? "destructive" : request.status === "COMPLETED" ? "default" : "secondary"}>{statusLabels[request.status]}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Demandée le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lubumbashi" }).format(new Date(request.createdAt))}</p></div><div className="flex flex-col gap-2 sm:flex-row">{request.type === "EXPORT" && request.status === "COMPLETED" ? <Button asChild size="sm"><a href={`/api/account/data-export?requestId=${encodeURIComponent(request.id)}`}><Download />Télécharger</a></Button> : null}{request.status === "PENDING" ? <Button size="sm" variant="outline" disabled={pending} onClick={() => cancel(request)}><X />Annuler</Button> : null}</div></div>
            {request.details ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{request.details}</p> : null}
            {request.responseMessage ? <div className="mt-3 border-l-2 border-primary bg-muted/40 px-3 py-2 text-sm"><p className="font-medium">Réponse de l’établissement</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{request.responseMessage}</p></div> : null}
          </article>
        ))}</div> : <div className="p-8 text-center"><FileCheck2 className="mx-auto size-7 text-muted-foreground" /><p className="mt-2 text-sm font-medium">Aucune demande pour le moment</p><p className="mt-1 text-xs text-muted-foreground">Vos futures demandes et leurs décisions apparaîtront ici.</p></div>}
      </section>
    </div>
  );
}
