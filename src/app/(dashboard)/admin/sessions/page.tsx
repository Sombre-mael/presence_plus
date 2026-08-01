import { Suspense } from "react";
import { SessionsManager } from "@/components/admin/sessions-manager";

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  return <Suspense><SessionsManager initialDate={date ?? ""} /></Suspense>;
}
