import { redirect } from "next/navigation";
import { getAuthenticatedViewer } from "@/lib/authenticated-viewer";
import { roleHome } from "@/lib/auth-navigation";

export default async function DashboardPage() {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) redirect("/login");
  if (viewer.mustChangePassword) redirect("/change-password");
  if (viewer.legalAcceptanceRequired) redirect("/legal/acceptance");
  redirect(roleHome(viewer.role));
}
