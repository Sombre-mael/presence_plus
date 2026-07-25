import { BookOpen, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EntityDialog } from "@/components/forms/entity-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { promotions } from "@/lib/mock-data";

export default function AdminPromotionsPage() {
  return (
    <div>
      <PageHeader
        title="Promotions"
        description="Organisez les étudiants et les cours par niveau académique."
        action={<EntityDialog title="Ajouter une promotion" description="Créez une promotion de démonstration." fields={[
          { name: "name", label: "Nom", placeholder: "L1 Informatique" },
          { name: "department", label: "Département", placeholder: "Sciences informatiques" },
        ]} />}
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {promotions.map((promotion) => (
          <Card key={promotion.id}>
            <CardHeader>
              <CardTitle>{promotion.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{promotion.department}</p>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 border-t pt-4">
              <div className="flex items-center gap-3">
                <Users className="size-4 text-primary" />
                <div><p className="metric-number font-semibold">{promotion.studentCount}</p><p className="text-xs text-muted-foreground">étudiants</p></div>
              </div>
              <div className="flex items-center gap-3">
                <BookOpen className="size-4 text-primary" />
                <div><p className="metric-number font-semibold">{promotion.courseCount}</p><p className="text-xs text-muted-foreground">cours</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
