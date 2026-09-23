"use client";

import { useState, useTransition } from "react";
import { Building2, LoaderCircle, Save } from "lucide-react";
import { updatePrivacySettingsAction } from "@/actions/super-admin.actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LegalConfiguration } from "@/types/privacy";

export function PrivacySystemSettings({ initialSettings }: { initialSettings: LegalConfiguration }) {
  const [settings, setSettings] = useState(initialSettings);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean }>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function update<K extends keyof LegalConfiguration>(key: K, value: LegalConfiguration[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    startTransition(async () => {
      const result = await updatePrivacySettingsAction(settings, password);
      setMessage({ text: result.message, error: !result.ok });
      setErrors(result.fieldErrors ?? {});
      if (!result.ok) return;
      if (result.value) setSettings(result.value);
      setPassword("");
    });
  }

  return (
    <section className="mt-5 border bg-background">
      <div className="flex gap-3 border-b p-5"><Building2 className="mt-0.5 size-5 text-primary" /><div><h2 className="font-semibold">Établissement et confidentialité</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Ces informations identifient le responsable du traitement dans les documents publics et définissent les durées principales.</p></div></div>
      <form onSubmit={submit} className="grid gap-5 p-5 sm:grid-cols-2">
        <Field label="Nom de l’établissement" name="institutionName" value={settings.institutionName} error={errors.institutionName} onChange={(value) => update("institutionName", value)} />
        <Field label="Contact confidentialité" name="privacyContactEmail" type="email" value={settings.privacyContactEmail} error={errors.privacyContactEmail} onChange={(value) => update("privacyContactEmail", value)} />
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="institutionAddress">Adresse de l’établissement</Label><Textarea id="institutionAddress" value={settings.institutionAddress} onChange={(event) => update("institutionAddress", event.target.value)} aria-invalid={Boolean(errors.institutionAddress)} />{errors.institutionAddress ? <p className="text-xs text-destructive">{errors.institutionAddress}</p> : null}</div>
        <Field label="Téléphone confidentialité (facultatif)" name="privacyContactPhone" value={settings.privacyContactPhone ?? ""} error={errors.privacyContactPhone} onChange={(value) => update("privacyContactPhone", value || undefined)} required={false} />
        <Field label="Conservation académique (mois)" name="academicRetentionMonths" type="number" value={String(settings.academicRetentionMonths)} error={errors.academicRetentionMonths} onChange={(value) => update("academicRetentionMonths", Number(value))} />
        <Field label="Conservation des audits (mois)" name="auditRetentionMonths" type="number" value={String(settings.auditRetentionMonths)} error={errors.auditRetentionMonths} onChange={(value) => update("auditRetentionMonths", Number(value))} />
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="institutionLegalDetails">Coordonnées ou mentions légales complémentaires</Label><Textarea id="institutionLegalDetails" value={settings.institutionLegalDetails ?? ""} onChange={(event) => update("institutionLegalDetails", event.target.value || undefined)} maxLength={500} /></div>
        <Field label="Votre mot de passe actuel" name="privacySettingsPassword" type="password" autoComplete="current-password" value={password} error={errors.currentPassword} onChange={setPassword} />
        {message ? <Alert variant={message.error ? "destructive" : "default"} className="sm:col-span-2"><AlertDescription>{message.text}</AlertDescription></Alert> : null}
        <div className="sm:col-span-2"><Button type="submit" disabled={pending || !password}>{pending ? <LoaderCircle className="animate-spin" /> : <Save />}{pending ? "Enregistrement..." : "Enregistrer les informations"}</Button></div>
      </form>
    </section>
  );
}

function Field({ label, name, value, onChange, type = "text", autoComplete, error, required = true }: { label: string; name: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string; error?: string; required?: boolean }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} type={type} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} required={required} />{error ? <p className="text-xs text-destructive">{error}</p> : null}</div>;
}
