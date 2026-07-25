import { TeacherSessionDetail } from "@/components/teacher/session-detail";

export default async function TeacherSessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TeacherSessionDetail id={id} />;
}
