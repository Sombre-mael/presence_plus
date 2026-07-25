import type { ReactNode } from "react";
import { AdminDataProvider } from "@/components/admin/admin-data-provider";
import { AdminShell } from "@/components/admin/admin-shell";
import { demoAccounts } from "@/lib/mock-data";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminDataProvider>
      <AdminShell user={demoAccounts.ADMIN}>{children}</AdminShell>
    </AdminDataProvider>
  );
}
