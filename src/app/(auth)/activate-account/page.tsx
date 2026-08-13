import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { PasswordWorkflowForm } from "@/components/auth/password-workflow-form";
import { inspectAuthToken } from "@/lib/auth-token.server";

export const dynamic = "force-dynamic";

export default async function ActivateAccountPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  const valid = await inspectAuthToken(token, "INVITATION");
  return <AuthPageShell title="Activer votre compte" description={valid ? `Bienvenue ${valid.user.name}. Choisissez votre premier mot de passe.` : "Ce lien d’activation est invalide, expiré ou déjà utilisé."}>{valid ? <PasswordWorkflowForm workflow="activate" token={token} /> : null}</AuthPageShell>;
}
