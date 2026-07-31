import { AdminSessionDetail } from "@/components/admin/sessions-manager";

export default async function AdminSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminSessionDetail id={id} />;
}
