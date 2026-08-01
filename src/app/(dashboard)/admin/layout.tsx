import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminDataProvider } from "@/components/admin/admin-data-provider";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAcademicSnapshot } from "@/lib/academic-repository";
import { getDemoViewer, roleHome } from "@/lib/demo-viewer";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = await getDemoViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "ADMIN") redirect(roleHome(viewer.role));
  const initialState = await getAcademicSnapshot(viewer);
  return (
    <AdminDataProvider initialState={initialState} viewerId={viewer.id}>
      <AdminShell user={viewer}>{children}</AdminShell>
    </AdminDataProvider>
  );
}
