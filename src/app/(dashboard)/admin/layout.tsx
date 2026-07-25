import type { ReactNode } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { demoAccounts } from "@/lib/mock-data";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout role="ADMIN" user={demoAccounts.ADMIN}>
      {children}
    </DashboardLayout>
  );
}
