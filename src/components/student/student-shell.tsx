"use client";

import type { ReactNode } from "react";
import type { UserSummary } from "@/types";
import { useAcademicData } from "@/components/admin/admin-data-provider";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getStudentNotifications } from "@/lib/student-domain";

export function StudentShell({ children, user, initialSidebarCollapsed = false }: { children: ReactNode; user: UserSummary; initialSidebarCollapsed?: boolean }) {
  const { state, resetData, syncStatus } = useAcademicData();
  return (
    <DashboardLayout
      role="STUDENT"
      user={user}
      anomalies={getStudentNotifications(state, user.id)}
      onResetDemo={resetData}
      initialSidebarCollapsed={initialSidebarCollapsed}
      syncStatus={syncStatus}
    >
      {children}
    </DashboardLayout>
  );
}
