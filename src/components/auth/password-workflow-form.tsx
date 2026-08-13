"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LoaderCircle } from "lucide-react";
import { activateAccountAction, changeOwnPasswordAction, resetPasswordAction, type AuthActionResult } from "@/actions/auth.actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NewPasswordInput, PasswordInput } from "@/components/auth/password-fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Workflow = "activate" | "reset" | "change";

export function PasswordWorkflowForm({ workflow, token, tokenValid = Boolean(token) }: { workflow: Workflow; token?: string; tokenValid?: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [result, setResult] = useState<AuthActionResult>();
  const [pending, startTransition] = useTransition();

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
        const first = Object.keys(response.fieldErrors ?? {})[0];
        const input = first ? formRef.current?.elements.namedItem(first) as HTMLElement | null : null;
        input?.focus();
        return;
      }
      if (workflow === "change") {
        await signOut({ redirect: false });
        router.replace("/login?notice=changed");
      } else {
        router.replace(`/login?notice=${workflow === "activate" ? "activated" : "reset"}`);
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="space-y-4">
      <div aria-live="polite">{result && !result.ok ? <Alert variant="destructive"><AlertDescription>{result.message}</AlertDescription></Alert> : null}</div>
      {workflow === "change" ? <PasswordInput id="current-password" name="currentPassword" label="Mot de passe actuel" autoComplete="current-password" error={result?.fieldErrors?.currentPassword} disabled={pending} /> : null}
      {workflow !== "change" && !tokenValid ? (
        <div className="space-y-4 border bg-muted/30 p-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">E-mail ou matricule</Label>
            <Input id="identifier" name="identifier" autoComplete="username" aria-invalid={Boolean(result?.fieldErrors?.identifier)} disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manualCode">Code à usage unique</Label>
            <Input id="manualCode" name="manualCode" autoComplete="one-time-code" inputMode="text" spellCheck={false} className="font-mono uppercase" placeholder="ABCDE-FGHJK" aria-invalid={Boolean(result?.fieldErrors?.manualCode)} disabled={pending} />
            <p className="text-xs text-muted-foreground">Le code est fourni par l’administration et peut être utilisé une seule fois.</p>
          </div>
        </div>
      ) : null}
      <NewPasswordInput error={result?.fieldErrors?.password} disabled={pending} />
      <PasswordInput id="confirmation" name="confirmation" label="Confirmer le nouveau mot de passe" autoComplete="new-password" error={result?.fieldErrors?.confirmation} disabled={pending} />
      <Button type="submit" className="h-11 w-full" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" />Enregistrement...</> : workflow === "activate" ? "Activer mon compte" : "Enregistrer le mot de passe"}</Button>
    </form>
  );
}
