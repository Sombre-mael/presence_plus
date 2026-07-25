import { Suspense } from "react";
import { UsersManager } from "@/components/admin/entity-managers";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  return (
    <Suspense>
      <UsersManager initialStatus={status === "INACTIVE" ? "INACTIVE" : "ALL"} />
    </Suspense>
  );
}
