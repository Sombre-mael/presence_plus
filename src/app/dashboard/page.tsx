import { redirect } from "next/navigation";
import { getAuthenticatedViewer } from "@/lib/authenticated-viewer";
import { roleHome } from "@/lib/auth-navigation";

export default async function DashboardPage() {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) redirect("/login");
  redirect(viewer.mustChangePassword ? "/change-password" : roleHome(viewer.role));
}
