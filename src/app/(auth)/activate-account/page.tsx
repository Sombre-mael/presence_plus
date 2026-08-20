import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { PasswordWorkflowForm } from "@/components/auth/password-workflow-form";
import { inspectAuthToken } from "@/lib/auth-token.server";

export const dynamic = "force-dynamic";

export default async function ActivateAccountPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  const valid = await inspectAuthToken(token, "INVITATION");
  return <AuthPageShell title="Activer votre compte" description={valid ? `Bienvenue ${valid.user.name}. Une phrase facile à retenir suffit pour protéger votre accès.` : "Vérifiez votre adresse e-mail et votre code d’activation, puis choisissez votre mot de passe."}><PasswordWorkflowForm workflow="activate" token={token} tokenValid={Boolean(valid)} /></AuthPageShell>;
}
