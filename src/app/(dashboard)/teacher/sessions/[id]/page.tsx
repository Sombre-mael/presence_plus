import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, QrCode, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/mock-data";

export default async function TeacherSessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getSession(id);
  if (!session) notFound();

  const rate = Math.round((session.presentCount / session.expectedCount) * 100);

  return (
    <div>
      <PageHeader
        title={session.courseName}
        description={`${session.courseCode} · ${session.promotion}`}
        action={<div className="flex gap-2">
          <Button asChild variant="outline"><Link href={`/teacher/sessions/${id}/attendances`}><Users /> Présences</Link></Button>
          <Button asChild><Link href={`/teacher/sessions/${id}/qr`}><QrCode /> QR code</Link></Button>
        </div>}
      />
      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader><CardTitle>Détails de la séance</CardTitle></CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="flex gap-3"><Clock className="size-4 text-primary" /><div><p className="text-sm font-medium">Date et heure</p><p className="text-sm text-muted-foreground">{session.date}, {session.startTime}-{session.endTime}</p></div></div>
            <div className="flex gap-3"><MapPin className="size-4 text-primary" /><div><p className="text-sm font-medium">Salle</p><p className="text-sm text-muted-foreground">{session.room}</p></div></div>
            <div className="flex gap-3"><Users className="size-4 text-primary" /><div><p className="text-sm font-medium">Promotion</p><p className="text-sm text-muted-foreground">{session.promotion}</p></div></div>
            <div><p className="mb-2 text-sm font-medium">Statut</p><StatusBadge status={session.status} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Participation</CardTitle></CardHeader>
          <CardContent>
            <p className="metric-number text-4xl font-semibold">{rate}%</p>
            <p className="mt-1 text-sm text-muted-foreground">{session.presentCount} sur {session.expectedCount} étudiants</p>
            <div className="mt-5 h-2 bg-muted"><div className="h-full bg-primary" style={{ width: `${rate}%` }} /></div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
