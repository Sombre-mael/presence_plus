import { ArrowUpRight } from "lucide-react";
import type { DashboardStat } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatGrid({ stats }: { stats: DashboardStat[] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} size="sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="metric-number text-2xl font-semibold">{stat.value}</p>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{stat.detail}</span>
              {stat.trend && (
                <span className="flex items-center text-primary">
                  <ArrowUpRight className="size-3" />
                  {stat.trend}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
