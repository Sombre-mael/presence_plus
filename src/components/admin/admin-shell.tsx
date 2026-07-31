"use client";

import type { ReactNode } from "react";
import type { UserSummary } from "@/types";
import { useAdminData } from "@/components/admin/admin-data-provider";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export function AdminShell({ children, user }: { children: ReactNode; user: UserSummary }) {
  const { anomalies, resetData } = useAdminData();

  return (
    <DashboardLayout
      role="ADMIN"
      user={user}
      anomalies={anomalies}
      onResetDemo={resetData}
    >
      {children}
    </DashboardLayout>
  );
}
