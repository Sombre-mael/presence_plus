import { PageHeader } from "@/components/dashboard/page-header";
import { QrPanel } from "@/components/sessions/qr-panel";

export default async function TeacherSessionQrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div>
      <PageHeader title="QR code de pointage" description="Projetez ce code pendant la séance ou partagez le code manuel." />
      <QrPanel sessionId={id} />
    </div>
  );
}
