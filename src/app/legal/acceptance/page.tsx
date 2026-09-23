import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { LegalAcceptanceForm } from "@/components/legal/legal-acceptance-form";
import { getAuthenticatedViewer } from "@/lib/authenticated-viewer";
import { roleHome } from "@/lib/auth-navigation";

export const dynamic = "force-dynamic";

export default async function LegalAcceptancePage() {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) redirect("/login?callbackUrl=/legal/acceptance");
  if (viewer.mustChangePassword) redirect("/change-password");
  if (!viewer.legalAcceptanceRequired) redirect(roleHome(viewer.role));
  return (
    <AuthPageShell
      title="Vos droits et les règles du service"
      description="Presence Plus a mis à jour ses documents. Prenez-en connaissance avant de poursuivre vers votre espace."
    >
      <LegalAcceptanceForm />
    </AuthPageShell>
  );
}
