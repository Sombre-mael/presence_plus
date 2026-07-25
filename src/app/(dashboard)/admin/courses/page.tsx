import { DemoTable } from "@/components/dashboard/demo-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { EntityDialog } from "@/components/forms/entity-dialog";
import { courses } from "@/lib/mock-data";

export default function AdminCoursesPage() {
  return (
    <div>
      <PageHeader
        title="Cours"
        description="Retrouvez les cours, enseignants et volumes horaires."
        action={<EntityDialog title="Ajouter un cours" description="Ajoutez un cours à la démonstration." fields={[
          { name: "code", label: "Code du cours", placeholder: "INF301" },
          { name: "name", label: "Intitulé", placeholder: "Développement web" },
          { name: "teacher", label: "Enseignant", placeholder: "Prénom Nom" },
        ]} />}
      />
      <DemoTable
        rows={courses.map((course) => ({
          id: course.id,
          cells: {
            code: course.code,
            name: course.name,
            teacher: course.teacher,
            promotion: course.promotion,
            hours: `${course.weeklyHours} h`,
          },
        }))}
        columns={[
          { key: "code", label: "Code" },
          { key: "name", label: "Cours" },
          { key: "teacher", label: "Enseignant", className: "hidden sm:table-cell" },
          { key: "promotion", label: "Promotion", className: "hidden lg:table-cell" },
          { key: "hours", label: "Par semaine" },
        ]}
        searchPlaceholder="Rechercher un cours..."
      />
    </div>
  );
}
