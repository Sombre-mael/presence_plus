import type { ReactNode } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { demoAccounts } from "@/lib/mock-data";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout role="STUDENT" user={demoAccounts.STUDENT}>
      {children}
    </DashboardLayout>
  );
}
