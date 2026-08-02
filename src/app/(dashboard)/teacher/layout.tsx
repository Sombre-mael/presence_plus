import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AcademicDataProvider } from "@/components/admin/admin-data-provider";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import { getAcademicSnapshot } from "@/lib/academic-repository";
import { getDemoViewer, roleHome } from "@/lib/demo-viewer";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const viewer = await getDemoViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "TEACHER") redirect(roleHome(viewer.role));
  const collapsed = (await cookies()).get("presence-plus-teacher-sidebar")?.value === "collapsed";
  const initialState = await getAcademicSnapshot(viewer);
  return (
    <AcademicDataProvider initialState={initialState} viewerId={viewer.id}>
      <TeacherShell user={viewer} initialSidebarCollapsed={collapsed}>{children}</TeacherShell>
    </AcademicDataProvider>
  );
}
