import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthenticatedViewer } from "@/lib/authenticated-viewer";
import { getSystemAdministrationData } from "@/actions/super-admin.actions";
import { SuperAdminManager } from "@/components/admin/super-admin-manager";

export const metadata: Metadata = { title: "Administration système · Presence Plus" };

export default async function AdminSystemPage() {
  const [viewer, data] = await Promise.all([getAuthenticatedViewer(), getSystemAdministrationData()]);
  if (!viewer || !data) notFound();
  return <SuperAdminManager data={data} viewerId={viewer.id} />;
}
