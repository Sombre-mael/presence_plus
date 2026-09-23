import type { Metadata } from "next";
import { getAdminPrivacyRequestsAction } from "@/actions/legal.actions";
import { PrivacyRequestsManager } from "@/components/admin/privacy-requests-manager";
import { getViewerForRole } from "@/lib/authenticated-viewer";

export const metadata: Metadata = { title: "Demandes relatives aux données · Presence Plus" };
export const dynamic = "force-dynamic";

export default async function AdminPrivacyRequestsPage() {
  const viewer = await getViewerForRole("ADMIN");
  return <PrivacyRequestsManager initialItems={await getAdminPrivacyRequestsAction()} adminLevel={viewer?.adminLevel} />;
}
