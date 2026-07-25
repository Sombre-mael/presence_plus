import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { DemoTable } from "@/components/dashboard/demo-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatGrid } from "@/components/dashboard/stat-grid";
import { Button } from "@/components/ui/button";
import { sessions, teacherStats } from "@/lib/mock-data";

export default function TeacherDashboardPage() {
  const teacherSessions = sessions.filter((session) => session.teacher === "Patrick Ilunga");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bonjour Patrick"
        description="Voici l’état de vos cours et sessions de présence."
        action={<Button asChild><Link href="/teacher/sessions/new"><Plus /> Nouvelle session</Link></Button>}
      />
      <StatGrid stats={teacherStats} />
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Vos dernières sessions</h2>
          <Button asChild variant="ghost" size="sm"><Link href="/teacher/sessions">Voir tout <ArrowRight /></Link></Button>
        </div>
        <DemoTable
          rows={teacherSessions.map((session) => ({
            id: session.id,
            status: session.status,
            href: `/teacher/sessions/${session.id}`,
            cells: {
              name: session.courseName,
              promotion: session.promotion,
              date: `${session.date} · ${session.startTime}`,
              room: session.room,
              attendance: `${session.presentCount}/${session.expectedCount}`,
              status: session.status,
            },
          }))}
          columns={[
            { key: "name", label: "Cours" },
            { key: "promotion", label: "Promotion", className: "hidden sm:table-cell" },
            { key: "date", label: "Date" },
            { key: "room", label: "Salle", className: "hidden lg:table-cell" },
            { key: "attendance", label: "Présences" },
            { key: "status", label: "Statut" },
          ]}
        />
      </section>
    </div>
  );
}
