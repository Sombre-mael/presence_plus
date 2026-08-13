import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getAuthenticatedViewer } from "@/lib/authenticated-viewer";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  if (await getAuthenticatedViewer()) redirect("/dashboard");
  return <AuthPageShell title="Mot de passe oublié" description="Indiquez votre e-mail ou votre matricule. La réponse reste volontairement identique, qu’un compte existe ou non."><ForgotPasswordForm /></AuthPageShell>;
}
