"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { CheckCircle2, LoaderCircle, Pencil } from "lucide-react";
import {
  activateAccountAction,
  changeOwnPasswordAction,
  previewAuthCodeAction,
  resetPasswordAction,
  type AuthActionResult,
} from "@/actions/auth.actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NewPasswordInput, PasswordInput } from "@/components/auth/password-fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Workflow = "activate" | "reset" | "change";

export function PasswordWorkflowForm({ workflow, token, tokenValid = Boolean(token) }: { workflow: Workflow; token?: string; tokenValid?: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const credentialFormRef = useRef<HTMLFormElement>(null);
  const manualWorkflow = workflow !== "change" && !tokenValid;
  const [step, setStep] = useState<"credential" | "password">(manualWorkflow ? "credential" : "password");
  const [manualCredential, setManualCredential] = useState<{ identifier: string; manualCode: string; displayName: string }>();
  const [result, setResult] = useState<AuthActionResult<unknown>>();
  const [activationFallback, setActivationFallback] = useState(false);
  const [pending, startTransition] = useTransition();

  function focusFirstError(errors?: Record<string, string>, form = formRef.current) {
    const first = Object.keys(errors ?? {})[0];
    const input = first ? form?.elements.namedItem(first) as HTMLElement | null : null;
    input?.focus();
  }

  function verifyManualCode(formData: FormData) {
    const identifier = String(formData.get("identifier") ?? "").trim();
    const manualCode = String(formData.get("manualCode") ?? "").trim();
    startTransition(async () => {
      const response = await previewAuthCodeAction(identifier, manualCode, workflow === "activate" ? "INVITATION" : "PASSWORD_RESET");
      if (!response.ok || !response.value) {
        setResult(response);
        focusFirstError(response.fieldErrors, credentialFormRef.current);
        return;
      }
      setResult(undefined);
      setManualCredential({ identifier: response.value.identifier, manualCode, displayName: response.value.displayName });
      setStep("password");
      window.requestAnimationFrame(() => {
        const passwordInput = formRef.current?.elements.namedItem("password");
        if (passwordInput instanceof HTMLElement) passwordInput.focus();
      });
    });
  }

  function submit(formData: FormData) {
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");
    const identifier = String(formData.get("identifier") ?? "");
    const manualCode = String(formData.get("manualCode") ?? "");
    startTransition(async () => {
      const response = workflow === "activate"
        ? await activateAccountAction(tokenValid ? token ?? "" : "", password, confirmation, identifier, manualCode)
        : workflow === "reset"
          ? await resetPasswordAction(tokenValid ? token ?? "" : "", password, confirmation, identifier, manualCode)
          : await changeOwnPasswordAction(currentPassword, password, confirmation);
      setResult(response);
      if (!response.ok) {
        focusFirstError(response.fieldErrors);
        return;
      }
      if (workflow === "change") {
        await signOut({ redirect: false });
        router.replace("/login?notice=changed");
      } else if (workflow === "reset") {
        router.replace("/login?notice=reset");
      } else if (response.value?.identifier) {
        try {
          const login = await signIn("credentials", { identifier: response.value.identifier, password, redirect: false });
          if (login?.ok) {
            router.replace("/dashboard");
            router.refresh();
            return;
          }
        } catch {
          // The account remains activated; the explicit login fallback is shown below.
        }
        setActivationFallback(true);
        setResult({ ok: true, message: "Votre compte est activé. Connectez-vous pour continuer." });
      }
    });
  }

  if (step === "credential") {
    return (
      <form ref={credentialFormRef} action={verifyManualCode} className="space-y-5">
        <div className="grid grid-cols-2 gap-2 text-xs font-medium" aria-label="Étapes d’activation">
          <span className="border-b-2 border-primary pb-2 text-primary">1. Vérifier le code</span>
          <span className="border-b pb-2 text-muted-foreground">2. Mot de passe</span>
        </div>
        <div aria-live="polite">{result && !result.ok ? <Alert variant="destructive"><AlertDescription>{result.message}</AlertDescription></Alert> : null}</div>
        <div className="space-y-2">
          <Label htmlFor="identifier">E-mail ou matricule</Label>
          <Input id="identifier" name="identifier" autoComplete="username" aria-invalid={Boolean(result?.fieldErrors?.identifier)} aria-describedby={result?.fieldErrors?.identifier ? "identifier-error" : undefined} disabled={pending} required autoFocus className="h-11" />
          {result?.fieldErrors?.identifier ? <p id="identifier-error" className="text-xs text-destructive">{result.fieldErrors.identifier}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="manualCode">Code à usage unique</Label>
          <Input id="manualCode" name="manualCode" autoComplete="one-time-code" inputMode="text" spellCheck={false} className="h-11 font-mono uppercase" placeholder="ABCDE-FGHJK" aria-invalid={Boolean(result?.fieldErrors?.manualCode)} aria-describedby={result?.fieldErrors?.manualCode ? "manual-code-error" : "manual-code-help"} disabled={pending} maxLength={11} required />
          {result?.fieldErrors?.manualCode ? <p id="manual-code-error" className="text-xs text-destructive">{result.fieldErrors.manualCode}</p> : null}
          <p id="manual-code-help" className="text-xs leading-5 text-muted-foreground">Utilisez le code personnel remis par votre établissement.</p>
        </div>
        <Button type="submit" className="h-11 w-full" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" />Vérification...</> : "Continuer"}</Button>
      </form>
    );
  }

  return (
    <form ref={formRef} action={submit} className="space-y-4">
      {manualWorkflow ? (
        <div className="grid grid-cols-2 gap-2 text-xs font-medium" aria-label="Étapes d’activation">
          <span className="border-b pb-2 text-muted-foreground">1. Code vérifié</span>
          <span className="border-b-2 border-primary pb-2 text-primary">2. Mot de passe</span>
        </div>
      ) : null}
      <div aria-live="polite">
        {result && !result.ok ? <Alert variant="destructive"><AlertDescription>{result.message}</AlertDescription></Alert> : null}
        {activationFallback ? <Alert className="border-emerald-200 bg-emerald-50"><AlertTitle>Compte activé</AlertTitle><AlertDescription>{result?.message}</AlertDescription></Alert> : null}
      </div>
      {activationFallback ? (
        <Button type="button" className="h-11 w-full" onClick={() => router.replace("/login?notice=activated")}>Se connecter</Button>
      ) : (
        <>
      {workflow === "change" ? <PasswordInput id="current-password" name="currentPassword" label="Mot de passe actuel" autoComplete="current-password" error={result?.fieldErrors?.currentPassword} disabled={pending} /> : null}
      {manualCredential ? (
        <div className="flex items-start gap-3 border bg-emerald-50 p-3 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
          <div className="min-w-0 flex-1"><p className="font-medium">Code vérifié pour {manualCredential.displayName}</p><p className="truncate text-xs text-muted-foreground">{manualCredential.identifier}</p></div>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Modifier le code" onClick={() => { setStep("credential"); setResult(undefined); }}><Pencil /></Button>
          <input type="hidden" name="identifier" value={manualCredential.identifier} />
          <input type="hidden" name="manualCode" value={manualCredential.manualCode} />
        </div>
      ) : null}
      <NewPasswordInput error={result?.fieldErrors?.password} disabled={pending} />
      <PasswordInput id="confirmation" name="confirmation" label="Confirmer le nouveau mot de passe" autoComplete="new-password" error={result?.fieldErrors?.confirmation} disabled={pending} />
      <Button type="submit" className="h-11 w-full" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" />Enregistrement...</> : workflow === "activate" ? "Activer mon compte" : "Enregistrer le mot de passe"}</Button>
        </>
      )}
    </form>
  );
}
