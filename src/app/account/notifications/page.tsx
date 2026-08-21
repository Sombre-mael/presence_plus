import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { NotificationSettings } from "@/components/notifications/notification-settings";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { getAuthenticatedViewer } from "@/lib/authenticated-viewer";
import { roleHome } from "@/lib/auth-navigation";
import { getNotificationPreferences, listNotificationsForUser } from "@/lib/notifications.server";

export default async function AccountNotificationsPage() {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) redirect("/login?callbackUrl=/account/notifications");
  if (viewer.mustChangePassword) redirect("/change-password");
  const [initialData, initialPreferences] = await Promise.all([
    listNotificationsForUser(viewer.id),
    getNotificationPreferences(viewer.id),
  ]);
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Retrouvez vos informations importantes et choisissez comment les recevoir."
        action={(
          <Button asChild variant="outline"><Link href={roleHome(viewer.role)}><ArrowLeft />Retour à mon espace</Link></Button>
        )}
      />
      <NotificationSettings
        initialData={initialData}
        initialPreferences={initialPreferences}
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || undefined}
      />
    </>
  );
}
