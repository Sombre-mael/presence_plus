"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { revokeOwnSessionsAction } from "@/actions/auth.actions";
import { PasswordInput } from "@/components/auth/password-fields";
import { PasswordWorkflowForm } from "@/components/auth/password-workflow-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function AccountSecurity() {
  const router = useRouter();
  const { data: session } = useSession();
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  function revoke(formData: FormData) {
    startTransition(async () => {
      const currentPassword = String(formData.get("currentPassword") ?? "");
      const result = await revokeOwnSessionsAction(currentPassword);
      setMessage(result.message);
      if (result.ok) {
        const renewed = await signIn("credentials", {
          identifier: session?.user.email,
          password: currentPassword,
          redirect: false,
        });
        if (!renewed?.ok) {
          router.replace("/login?notice=revoked");
        } else {
          router.refresh();
        }
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="border bg-background p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Changer le mot de passe</h2>
        <p className="mt-1 text-sm text-muted-foreground">Le changement révoquera les sessions qui utilisent encore votre ancien mot de passe.</p>
        <div className="mt-5 max-w-md"><PasswordWorkflowForm workflow="change" /></div>
      </section>
      <section className="border bg-background p-5 sm:p-6">
        <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 text-primary" /><div><h2 className="font-semibold">Sessions ouvertes</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Révoquez les autres connexions à votre compte. Cette session sera renouvelée après vérification.</p></div></div>
        <form action={revoke} className="mt-4 max-w-md space-y-3">
          <PasswordInput id="revoke-current-password" name="currentPassword" label="Mot de passe actuel" autoComplete="current-password" disabled={pending} />
          <div aria-live="polite">{message ? <Alert><AlertDescription>{message}</AlertDescription></Alert> : null}</div>
          <Button variant="outline" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" />Révocation...</> : "Révoquer les autres sessions"}</Button>
        </form>
      </section>
    </div>
  );
}
