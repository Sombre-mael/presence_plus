import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { PasswordWorkflowForm } from "@/components/auth/password-workflow-form";
import { getAuthenticatedViewer } from "@/lib/authenticated-viewer";
import { roleHome } from "@/lib/auth-navigation";

export default async function ChangePasswordPage() {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) redirect("/login?callbackUrl=/change-password");
  if (!viewer.mustChangePassword) redirect(roleHome(viewer.role));
  return <AuthPageShell title="Sécurisez votre compte" description="Votre mot de passe actuel est temporaire. Remplacez-le avant d’accéder à l’application."><PasswordWorkflowForm workflow="change" /></AuthPageShell>;
}
