import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const weeklyData = [
  { day: "Lun", value: 88 },
  { day: "Mar", value: 92 },
  { day: "Mer", value: 84 },
  { day: "Jeu", value: 90 },
  { day: "Ven", value: 81 },
];

export default function AdminStatisticsPage() {
  return (
    <div>
      <PageHeader title="Statistiques" description="Analyse synthétique des présences sur les trente derniers jours." />
      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader>
            <CardTitle>Présence moyenne par jour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-end gap-4 border-b px-2 pt-8 sm:gap-8">
              {weeklyData.map((item) => (
                <div className="flex h-full flex-1 flex-col justify-end gap-2" key={item.day}>
                  <span className="metric-number text-center text-xs font-medium">{item.value}%</span>
                  <div className="w-full bg-primary/85" style={{ height: `${item.value}%` }} />
                  <span className="pb-2 text-center text-xs text-muted-foreground">{item.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              ["Présents", 87, "bg-emerald-500"],
              ["Retards", 8, "bg-amber-500"],
              ["Absents", 5, "bg-red-500"],
            ].map(([label, value, color]) => (
              <div key={label as string}>
                <div className="mb-2 flex justify-between text-sm">
                  <span>{label as string}</span>
                  <span className="metric-number font-medium">{value as number}%</span>
                </div>
                <div className="h-2 bg-muted">
                  <div className={`h-full ${color as string}`} style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
            <div className="border-t pt-4 text-sm text-muted-foreground">
              1 284 pointages analysés sur la période.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
