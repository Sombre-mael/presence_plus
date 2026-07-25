import { DemoTable } from "@/components/dashboard/demo-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { EntityDialog } from "@/components/forms/entity-dialog";
import { demoUsers } from "@/lib/mock-data";

const roleLabels = { ADMIN: "Administrateur", TEACHER: "Enseignant", STUDENT: "Étudiant" };

export default function AdminUsersPage() {
  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        description="Consultez les comptes et leur rôle dans l’établissement."
        action={<EntityDialog title="Ajouter un utilisateur" description="Les données restent locales dans cette démonstration." fields={[
          { name: "name", label: "Nom complet", placeholder: "Prénom Nom" },
          { name: "email", label: "Adresse e-mail", placeholder: "prenom@etablissement.cd" },
        ]} />}
      />
      <DemoTable
        rows={demoUsers.map((user) => ({
          id: user.id,
          status: user.status,
          cells: {
            name: user.name,
            email: user.email,
            role: roleLabels[user.role],
            promotion: user.promotion ?? "—",
            status: user.status,
          },
        }))}
        columns={[
          { key: "name", label: "Utilisateur" },
          { key: "email", label: "E-mail", className: "hidden sm:table-cell" },
          { key: "role", label: "Rôle" },
          { key: "promotion", label: "Promotion", className: "hidden lg:table-cell" },
          { key: "status", label: "Statut" },
        ]}
        searchPlaceholder="Rechercher un utilisateur..."
        showStatusFilter
      />
    </div>
  );
}
