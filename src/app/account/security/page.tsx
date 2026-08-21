import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccountSecurity } from "@/components/auth/account-security";
import { PageHeader } from "@/components/dashboard/page-header";
import { getAuthenticatedViewer } from "@/lib/authenticated-viewer";
import { listActiveAuthSessions } from "@/lib/auth-session.server";
import { roleHome } from "@/lib/auth-navigation";
import { Button } from "@/components/ui/button";

export default async function AccountSecurityPage() {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) redirect("/login?callbackUrl=/account/security");
  if (viewer.mustChangePassword) redirect("/change-password");
  const sessions = await listActiveAuthSessions(viewer.id, viewer.authSessionId);
  return (
    <>
      <PageHeader
        title="Sécurité du compte"
        description={`Compte de ${viewer.name} · ${viewer.email}`}
        action={<Button asChild variant="outline"><Link href={roleHome(viewer.role)}><ArrowLeft />Retour à mon espace</Link></Button>}
      />
      <AccountSecurity initialSessions={sessions} />
    </>
  );
}
