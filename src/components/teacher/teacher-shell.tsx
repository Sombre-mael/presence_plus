"use client";

import type { ReactNode } from "react";
import type { UserSummary } from "@/types";
import { useAcademicData } from "@/components/admin/admin-data-provider";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getTeacherNotifications } from "@/lib/academic-domain";
import { getTeacherCorrectionNotifications } from "@/lib/student-domain";

export function TeacherShell({
  children,
  user,
  initialSidebarCollapsed = false,
}: {
  children: ReactNode;
  user: UserSummary;
  initialSidebarCollapsed?: boolean;
}) {
  const { state, resetData, syncStatus } = useAcademicData();
  const notifications = [
    ...getTeacherCorrectionNotifications(state, user.id),
    ...getTeacherNotifications(state, user.id),
  ];

  return (
    <DashboardLayout
      role="TEACHER"
      user={user}
      anomalies={notifications}
      onResetDemo={resetData}
      initialSidebarCollapsed={initialSidebarCollapsed}
      syncStatus={syncStatus}
    >
      {children}
    </DashboardLayout>
  );
}
