import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPrivacyDashboardData } from "@/actions/legal.actions";
import { PrivacyCenter } from "@/components/account/privacy-center";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { getAuthenticatedViewer } from "@/lib/authenticated-viewer";
import { roleHome } from "@/lib/auth-navigation";

export const metadata: Metadata = { title: "Confidentialité · Presence Plus" };
export const dynamic = "force-dynamic";

export default async function AccountPrivacyPage() {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) redirect("/login?callbackUrl=/account/privacy");
  if (viewer.mustChangePassword) redirect("/change-password");
  const data = await getPrivacyDashboardData();
  if (!data) redirect("/login?callbackUrl=/account/privacy");
  return <><PageHeader title="Confidentialité et mes données" description="Consultez les données détenues, les durées applicables et exercez vos droits." action={<Button asChild variant="outline"><Link href={roleHome(viewer.role)}><ArrowLeft />Retour à mon espace</Link></Button>} /><PrivacyCenter initialData={data} /></>;
}
