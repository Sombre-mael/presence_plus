"use client";

import type { ReactNode } from "react";
import type { UserSummary } from "@/types";
import { useAdminData } from "@/components/admin/admin-data-provider";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export function AdminShell({ children, user, initialSidebarCollapsed = false }: { children: ReactNode; user: UserSummary; initialSidebarCollapsed?: boolean }) {
  const { anomalies, resetData, syncStatus } = useAdminData();

  return (
    <DashboardLayout
      role="ADMIN"
      user={user}
      anomalies={anomalies}
      onResetDemo={resetData}
      initialSidebarCollapsed={initialSidebarCollapsed}
      syncStatus={syncStatus}
    >
      {children}
    </DashboardLayout>
  );
}
