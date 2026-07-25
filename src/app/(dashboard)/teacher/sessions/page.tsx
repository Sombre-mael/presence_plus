import Link from "next/link";
import { Plus } from "lucide-react";
import { DemoTable } from "@/components/dashboard/demo-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { sessions } from "@/lib/mock-data";

export default function TeacherSessionsPage() {
  return (
    <div>
      <PageHeader
        title="Mes sessions"
        description="Consultez vos séances, leurs statuts et les présences collectées."
        action={<Button asChild><Link href="/teacher/sessions/new"><Plus /> Nouvelle session</Link></Button>}
      />
      <DemoTable
        rows={sessions.filter((session) => session.teacher === "Patrick Ilunga").map((session) => ({
          id: session.id,
          status: session.status,
          href: `/teacher/sessions/${session.id}`,
          cells: {
            name: `${session.courseCode} · ${session.courseName}`,
            promotion: session.promotion,
            date: `${session.date} · ${session.startTime}-${session.endTime}`,
            room: session.room,
            attendance: `${session.presentCount}/${session.expectedCount}`,
            status: session.status,
          },
        }))}
        columns={[
          { key: "name", label: "Cours" },
          { key: "promotion", label: "Promotion", className: "hidden sm:table-cell" },
          { key: "date", label: "Date et heure" },
          { key: "room", label: "Salle", className: "hidden lg:table-cell" },
          { key: "attendance", label: "Présences" },
          { key: "status", label: "Statut" },
        ]}
        searchPlaceholder="Rechercher une session..."
        showStatusFilter
      />
    </div>
  );
}
