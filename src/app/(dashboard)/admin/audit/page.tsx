import { Suspense } from "react";
import { AuditManager } from "@/components/admin/audit-manager";

export default function AdminAuditPage() {
  return <Suspense><AuditManager /></Suspense>;
}
