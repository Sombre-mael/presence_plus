import { PageHeader } from "@/components/dashboard/page-header";
import { TeacherSessionForm } from "@/components/teacher/session-form";

export default async function EditTeacherSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <PageHeader
        title="Modifier la session"
        description="Ajustez la planification avant l’ouverture du pointage."
      />
      <TeacherSessionForm sessionId={id} />
    </div>
  );
}
