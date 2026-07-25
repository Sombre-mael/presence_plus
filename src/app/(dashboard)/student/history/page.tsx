import { DemoTable } from "@/components/dashboard/demo-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { attendances, sessions } from "@/lib/mock-data";

export default function StudentHistoryPage() {
  const records = attendances.filter((item) => item.studentId === "u4");

  return (
    <div>
      <PageHeader title="Mon historique" description="Consultez toutes vos présences et vos éventuels retards." />
      <DemoTable
        rows={records.map((record) => {
          const session = sessions.find((item) => item.id === record.sessionId);
          return {
            id: record.id,
            status: record.status,
            cells: {
              name: session?.courseName ?? "Cours",
              code: session?.courseCode ?? "—",
              date: session?.date ?? "—",
              teacher: session?.teacher ?? "—",
              time: record.checkedInAt ?? "—",
              status: record.status,
            },
          };
        })}
        columns={[
          { key: "name", label: "Cours" },
          { key: "code", label: "Code", className: "hidden sm:table-cell" },
          { key: "date", label: "Date" },
          { key: "teacher", label: "Enseignant", className: "hidden lg:table-cell" },
          { key: "time", label: "Heure" },
          { key: "status", label: "Statut" },
        ]}
        searchPlaceholder="Rechercher un cours..."
        showStatusFilter
      />
    </div>
  );
}
