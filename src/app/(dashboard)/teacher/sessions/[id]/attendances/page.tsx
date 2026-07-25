import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { DemoTable } from "@/components/dashboard/demo-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { getSession, getSessionAttendances } from "@/lib/mock-data";

export default async function TeacherSessionAttendancesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getSession(id);
  if (!session) notFound();
  const records = getSessionAttendances(id);

  return (
    <div>
      <PageHeader
        title="Présences de la session"
        description={`${session.courseName} · ${session.date} · ${records.length} enregistrements de démonstration`}
        action={<Button asChild variant="outline"><Link href={`/api/exports?sessionId=${id}`}><Download /> Exporter en CSV</Link></Button>}
      />
      <DemoTable
        rows={records.map((record) => ({
          id: record.id,
          status: record.status,
          cells: {
            name: record.studentName,
            matricule: record.matricule,
            promotion: record.promotion,
            time: record.checkedInAt ?? "—",
            status: record.status,
          },
        }))}
        columns={[
          { key: "name", label: "Étudiant" },
          { key: "matricule", label: "Matricule" },
          { key: "promotion", label: "Promotion", className: "hidden md:table-cell" },
          { key: "time", label: "Heure" },
          { key: "status", label: "Statut" },
        ]}
        searchPlaceholder="Rechercher un étudiant..."
        showStatusFilter
      />
    </div>
  );
}
