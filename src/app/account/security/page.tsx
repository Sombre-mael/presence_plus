import { redirect } from "next/navigation";
import { AccountSecurity } from "@/components/auth/account-security";
import { PageHeader } from "@/components/dashboard/page-header";
import { getAuthenticatedViewer } from "@/lib/authenticated-viewer";

export default async function AccountSecurityPage() {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) redirect("/login?callbackUrl=/account/security");
  if (viewer.mustChangePassword) redirect("/change-password");
  return <main className="min-h-screen bg-muted/30 p-4 sm:p-8"><div className="mx-auto max-w-3xl"><PageHeader title="Sécurité du compte" description={`Compte de ${viewer.name} · ${viewer.email}`} /><AccountSecurity /></div></main>;
}
