"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileCheck2, FileUp, LoaderCircle, RotateCcw, Upload } from "lucide-react";
import { applyAdminImportAction, previewAdminImportAction } from "@/actions/admin-import.actions";
import { useAdminData } from "@/components/admin/admin-data-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminImportKind, AdminImportPreview } from "@/types/admin-import";

const templates: Record<AdminImportKind, string> = {
  USERS: "nom,email,role,matricule,promotion,statut\nSarah Mbuyi,sarah@example.org,STUDENT,ETU-001,L2 Informatique,ACTIVE\nPatrick Ilunga,patrick@example.org,TEACHER,,,ACTIVE\n",
  PROMOTIONS: "nom,departement,annee_academique,description\nL2 Informatique,Sciences informatiques,2026-2027,Deuxième année de licence\n",
  COURSES: "code,intitule,enseignant_email,promotion,heures_hebdomadaires,description\nINF301,Développement web,patrick@example.org,L2 Informatique,4,Cours principal\n",
};

const kindLabels: Record<AdminImportKind, string> = { USERS: "Étudiants et enseignants", PROMOTIONS: "Promotions", COURSES: "Cours" };

export function AdminImportManager() {
  const { resetData } = useAdminData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<AdminImportKind>("USERS");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<AdminImportPreview>();
  const [message, setMessage] = useState<{ text: string; error: boolean }>();
  const [pending, startTransition] = useTransition();

  function reset() {
    setCsvText("");
    setFileName("");
    setPreview(undefined);
    setMessage(undefined);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function chooseFile(file?: File) {
    if (!file) return;
    setFileName(file.name);
    setCsvText(await file.text());
    setPreview(undefined);
    setMessage(undefined);
  }

  function previewFile() {
    setMessage(undefined);
    startTransition(async () => {
      const result = await previewAdminImportAction(kind, csvText);
      setPreview(result.preview);
      setMessage({ text: result.message, error: !result.ok });
    });
  }

  function applyImport() {
    setMessage(undefined);
    startTransition(async () => {
      const result = await applyAdminImportAction(kind, csvText);
      setMessage({ text: result.message, error: !result.ok });
      if (!result.ok) {
        if (result.preview) setPreview(result.preview);
        return;
      }
      await resetData();
      setPreview(undefined);
      setCsvText("");
      setFileName("");
    });
  }

  function downloadTemplate() {
    const blob = new Blob([templates[kind]], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `presence-plus-${kind.toLocaleLowerCase("fr")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title="Importation" description="Ajoutez les référentiels et comptes nécessaires au suivi des présences." action={<Button variant="outline" onClick={downloadTemplate}><Download />Télécharger le modèle</Button>} />
      <section className="border bg-background">
        <div className="grid gap-5 border-b p-5 md:grid-cols-[240px_minmax(0,1fr)]">
          <div className="space-y-2"><Label htmlFor="import-kind">Données à importer</Label><Select value={kind} onValueChange={(value) => { setKind(value as AdminImportKind); reset(); }}><SelectTrigger id="import-kind" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USERS">Étudiants et enseignants</SelectItem><SelectItem value="PROMOTIONS">Promotions</SelectItem><SelectItem value="COURSES">Cours</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="import-file">Fichier CSV</Label><button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-24 w-full items-center gap-4 border border-dashed p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary"><span className="flex size-11 shrink-0 items-center justify-center bg-primary/10 text-primary"><FileUp /></span><span className="min-w-0"><span className="block truncate text-sm font-medium">{fileName || `Sélectionner le fichier ${kindLabels[kind].toLocaleLowerCase("fr")}`}</span><span className="mt-1 block text-xs text-muted-foreground">CSV, 500 lignes et 600 Ko maximum</span></span></button><input ref={inputRef} id="import-file" type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void chooseFile(event.target.files?.[0])} /></div>
        </div>
        <div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-between"><Button variant="ghost" disabled={pending || !csvText} onClick={reset}><RotateCcw />Réinitialiser</Button><Button disabled={pending || !csvText} onClick={previewFile}>{pending ? <LoaderCircle className="animate-spin" /> : <FileCheck2 />}{pending ? "Vérification..." : "Vérifier le fichier"}</Button></div>
      </section>

      {message ? <Alert variant={message.error ? "destructive" : "default"}><AlertTitle>{message.error ? "Import à corriger" : "Fichier vérifié"}</AlertTitle><AlertDescription>{message.text}</AlertDescription></Alert> : null}

      {preview ? <section className="border bg-background">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Aperçu</h2><p className="mt-1 text-xs text-muted-foreground">{preview.total} ligne(s), {preview.validCount} valide(s), {preview.invalidCount} à corriger</p></div><div className="flex gap-2"><Badge variant="secondary">{preview.validCount} valides</Badge>{preview.invalidCount ? <Badge variant="destructive">{preview.invalidCount} erreurs</Badge> : null}</div></div>
        <div className="max-h-[420px] divide-y overflow-y-auto">
          {preview.rows.map((row) => <div key={row.line} className="grid gap-2 p-4 md:grid-cols-[70px_minmax(0,1fr)]"><p className="text-xs font-medium text-muted-foreground">Ligne {row.line}</p><div className="min-w-0"><p className="break-words text-sm">{Object.values(row.values).filter(Boolean).join(" · ")}</p>{row.errors.length ? <ul className="mt-2 space-y-1 text-xs text-destructive">{row.errors.map((error) => <li key={error}>{error}</li>)}</ul> : <p className="mt-2 text-xs text-emerald-700">Prête à importer</p>}</div></div>)}
        </div>
        <div className="border-t p-4"><Button className="w-full sm:w-auto" disabled={pending || preview.invalidCount > 0 || preview.total === 0} onClick={applyImport}>{pending ? <LoaderCircle className="animate-spin" /> : <Upload />}{pending ? "Importation..." : `Importer ${preview.validCount} ligne(s)`}</Button></div>
      </section> : null}
    </div>
  );
}
