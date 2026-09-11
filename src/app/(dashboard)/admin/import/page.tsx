import type { Metadata } from "next";
import { AdminImportManager } from "@/components/admin/admin-import-manager";

export const metadata: Metadata = { title: "Importation · Presence Plus" };

export default function AdminImportPage() {
  return <AdminImportManager />;
}
