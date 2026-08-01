import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AcademicDataProvider } from "@/components/admin/admin-data-provider";
import { StudentShell } from "@/components/student/student-shell";
import { getAcademicSnapshot } from "@/lib/academic-repository";
import { getDemoViewer, roleHome } from "@/lib/demo-viewer";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const viewer = await getDemoViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "STUDENT") redirect(roleHome(viewer.role));
  const initialState = await getAcademicSnapshot(viewer);
  return (
    <AcademicDataProvider initialState={initialState} viewerId={viewer.id}>
      <StudentShell user={viewer}>{children}</StudentShell>
    </AcademicDataProvider>
  );
}
