import type { ReactNode } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { demoAccounts } from "@/lib/mock-data";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout role="TEACHER" user={demoAccounts.TEACHER}>
      {children}
    </DashboardLayout>
  );
}
