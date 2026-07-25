import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { QrPanel } from "@/components/sessions/qr-panel";
import { getSession } from "@/lib/mock-data";

export default async function TeacherSessionQrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getSession(id);
  if (!session) notFound();

  return (
    <div>
      <PageHeader title="QR code de pointage" description={`${session.courseName} · ${session.promotion} · Salle ${session.room}`} />
      <QrPanel sessionId={id} />
    </div>
  );
}
