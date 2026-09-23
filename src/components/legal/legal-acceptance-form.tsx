"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { acceptCurrentLegalDocumentsAction } from "@/actions/legal.actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function LegalAcceptanceForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const response = await acceptCurrentLegalDocumentsAction(
        formData.get("termsAccepted") === "on",
        formData.get("privacyAcknowledged") === "on",
      );
      setMessage(response.ok ? undefined : response.message);
      setErrors(response.fieldErrors ?? {});
      if (!response.ok) {
        const first = Object.keys(response.fieldErrors ?? {})[0];
        const field = first ? formRef.current?.elements.namedItem(first) : null;
        if (field instanceof HTMLElement) field.focus();
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    });
  }

  return (
    <form ref={formRef} action={submit} className="space-y-4">
      {message ? <Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert> : null}
      <label className="flex min-h-12 cursor-pointer items-start gap-3 border bg-background p-3 text-sm leading-6">
        <input name="termsAccepted" type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" aria-invalid={Boolean(errors.termsAccepted)} aria-describedby={errors.termsAccepted ? "acceptance-terms-error" : undefined} disabled={pending} />
        <span>J’accepte les <Link href="/legal/terms" target="_blank" className="font-semibold text-primary underline underline-offset-4">conditions d’utilisation</Link> de Presence Plus.</span>
      </label>
      {errors.termsAccepted ? <p id="acceptance-terms-error" className="text-xs text-destructive">{errors.termsAccepted}</p> : null}
      <label className="flex min-h-12 cursor-pointer items-start gap-3 border bg-background p-3 text-sm leading-6">
        <input name="privacyAcknowledged" type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" aria-invalid={Boolean(errors.privacyAcknowledged)} aria-describedby={errors.privacyAcknowledged ? "acceptance-privacy-error" : undefined} disabled={pending} />
        <span>Je confirme avoir lu la <Link href="/legal/privacy" target="_blank" className="font-semibold text-primary underline underline-offset-4">politique de confidentialité</Link> et compris l’usage de mes données.</span>
      </label>
      {errors.privacyAcknowledged ? <p id="acceptance-privacy-error" className="text-xs text-destructive">{errors.privacyAcknowledged}</p> : null}
      <p className="text-xs leading-5 text-muted-foreground">Aucune case n’est cochée automatiquement. Vous pouvez consulter les documents avant de faire votre choix.</p>
      <Button type="submit" className="h-11 w-full" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" />Enregistrement...</> : <><ShieldCheck />Accepter et continuer</>}</Button>
    </form>
  );
}
