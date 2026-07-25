import Link from "next/link";
import { ArrowRight, Clock, MapPin, QrCode } from "lucide-react";
import { DemoTable } from "@/components/dashboard/demo-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatGrid } from "@/components/dashboard/stat-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { attendances, sessions, studentStats } from "@/lib/mock-data";

export default function StudentDashboardPage() {
  const current = sessions[0];
  const historyRows = attendances.filter((item) => item.studentId === "u4").slice(0, 3).map((record) => {
    const session = sessions.find((item) => item.id === record.sessionId);
    return {
      id: record.id,
      status: record.status,
      cells: {
        name: session?.courseName ?? "Cours",
        date: session?.date ?? "—",
        time: record.checkedInAt ?? "—",
        status: record.status,
      },
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Bonjour Sarah" description="Retrouvez vos cours et votre suivi de présence." />
      <StatGrid stats={studentStats} />
      <Card>
        <CardHeader><CardTitle>Session disponible maintenant</CardTitle></CardHeader>
        <CardContent className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold">{current.courseName}</p>
            <p className="mt-1 text-sm text-muted-foreground">{current.courseCode} · {current.teacher}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Clock className="size-4" /> {current.startTime}-{current.endTime}</span>
              <span className="flex items-center gap-1.5"><MapPin className="size-4" /> Salle {current.room}</span>
            </div>
          </div>
          <Button asChild><Link href="/student/check-in"><QrCode /> Pointer maintenant</Link></Button>
        </CardContent>
      </Card>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Dernières présences</h2>
          <Button asChild variant="ghost" size="sm"><Link href="/student/history">Historique complet <ArrowRight /></Link></Button>
        </div>
        <DemoTable rows={historyRows} columns={[
          { key: "name", label: "Cours" },
          { key: "date", label: "Date" },
          { key: "time", label: "Heure" },
          { key: "status", label: "Statut" },
        ]} />
      </section>
    </div>
  );
}
