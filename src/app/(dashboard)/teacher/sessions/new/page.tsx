import { PageHeader } from "@/components/dashboard/page-header";
import { NewSessionForm } from "@/components/forms/new-session-form";

export default function NewTeacherSessionPage() {
  return (
    <div>
      <PageHeader title="Nouvelle session" description="Préparez une séance et son code de pointage." />
      <NewSessionForm />
    </div>
  );
}
