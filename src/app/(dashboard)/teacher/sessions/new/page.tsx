import { PageHeader } from "@/components/dashboard/page-header";
import { TeacherSessionForm } from "@/components/teacher/session-form";

export default function NewTeacherSessionPage() {
  return (
    <div>
      <PageHeader title="Nouvelle session" description="Préparez une séance et son code de pointage." />
      <TeacherSessionForm />
    </div>
  );
}
