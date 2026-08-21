import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProfileOverview } from "@/components/account/profile-overview";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { getAccountProfile } from "@/lib/account-profile.server";
import { roleHome } from "@/lib/auth-navigation";
import { getAuthenticatedViewer } from "@/lib/authenticated-viewer";

export const metadata: Metadata = {
  title: "Mon profil · Presence Plus",
};

export default async function AccountProfilePage() {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) redirect("/login?callbackUrl=/account/profile");
  if (viewer.mustChangePassword) redirect("/change-password");

  const profile = await getAccountProfile(viewer.id);
  if (!profile) redirect("/login");

  return (
    <>
      <PageHeader
        title="Mon profil"
        description="Personnalisez votre compte et consultez vos informations académiques."
        action={(
          <Button asChild variant="outline">
            <Link href={roleHome(viewer.role)}><ArrowLeft />Retour à mon espace</Link>
          </Button>
        )}
      />
      <ProfileOverview profile={profile} />
    </>
  );
}
