import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { DemoTable } from "@/components/dashboard/demo-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatGrid } from "@/components/dashboard/stat-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminStats, sessions } from "@/lib/mock-data";

export default function AdminDashboardPage() {
  const rows = sessions.slice(0, 3).map((session) => ({
    id: session.id,
    status: session.status,
    href: `/teacher/sessions/${session.id}`,
    cells: {
      name: session.courseName,
      promotion: session.promotion,
      teacher: session.teacher,
      date: `${session.date} · ${session.startTime}`,
      status: session.status,
    },
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Vue d’ensemble" description="Suivez l’activité académique et les présences du jour." />
      <StatGrid stats={adminStats} />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="min-w-0 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Sessions récentes</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/statistics">Toutes les statistiques <ArrowRight /></Link>
            </Button>
          </div>
          <DemoTable
            rows={rows}
            columns={[
              { key: "name", label: "Cours" },
              { key: "promotion", label: "Promotion" },
              { key: "teacher", label: "Enseignant", className: "hidden md:table-cell" },
              { key: "date", label: "Date" },
              { key: "status", label: "Statut" },
            ]}
          />
        </section>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Activité du jour</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ["08:00", "Algorithmique avancée", "B12"],
              ["10:30", "Bases de données", "Lab 2"],
              ["14:00", "Comptabilité générale", "A08"],
            ].map(([time, course, room]) => (
              <div key={`${time}-${course}`} className="flex gap-3 border-b pb-3 last:border-0 last:pb-0">
                <CalendarDays className="mt-0.5 size-4 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{course}</p>
                  <p className="text-xs text-muted-foreground">{time} · Salle {room}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
