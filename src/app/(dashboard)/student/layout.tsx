import type { ReactNode } from "react";
import { AcademicDataProvider } from "@/components/admin/admin-data-provider";
import { StudentShell } from "@/components/student/student-shell";
import { demoAccounts } from "@/lib/mock-data";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <AcademicDataProvider>
      <StudentShell user={demoAccounts.STUDENT}>{children}</StudentShell>
    </AcademicDataProvider>
  );
}
