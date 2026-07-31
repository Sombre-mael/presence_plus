import { AttendanceManager } from "@/components/teacher/attendance-manager";

export default async function TeacherSessionAttendancesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ request?: string }>;
}) {
  const { id } = await params;
  const { request } = await searchParams;
  return <AttendanceManager sessionId={id} highlightedRequestId={request} />;
}
