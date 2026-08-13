import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { PasswordWorkflowForm } from "@/components/auth/password-workflow-form";
import { inspectAuthToken } from "@/lib/auth-token.server";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  const valid = await inspectAuthToken(token, "PASSWORD_RESET");
  return <AuthPageShell title="Réinitialiser le mot de passe" description={valid ? "Choisissez un mot de passe robuste. Le lien sera invalidé après cette opération." : "Ce lien de réinitialisation est invalide, expiré ou déjà utilisé."}>{valid ? <PasswordWorkflowForm workflow="reset" token={token} /> : null}</AuthPageShell>;
}
