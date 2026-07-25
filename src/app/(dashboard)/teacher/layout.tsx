import type { ReactNode } from "react";
import { AcademicDataProvider } from "@/components/admin/admin-data-provider";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import { demoAccounts } from "@/lib/mock-data";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <AcademicDataProvider>
      <TeacherShell user={demoAccounts.TEACHER}>{children}</TeacherShell>
    </AcademicDataProvider>
  );
}
