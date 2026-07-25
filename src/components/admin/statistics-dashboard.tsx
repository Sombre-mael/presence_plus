"use client";

import { useMemo, useState } from "react";
import { Download, TrendingUp, Users, CalendarCheck, ClockAlert } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAdminData } from "@/components/admin/admin-data-provider";
import { getAttendanceTrend, getFilteredSessions } from "@/lib/admin-domain";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StatisticsFilters, StatisticsPeriod } from "@/types/admin";

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function StatisticsDashboard() {
  const { state, notify } = useAdminData();
  const [period, setPeriod] = useState<StatisticsPeriod>("30D");
  const [promotionId, setPromotionId] = useState("");
  const [courseId, setCourseId] = useState("");
  const filters: StatisticsFilters = { period, promotionId, courseId };
  const sessions = useMemo(
    () => getFilteredSessions(state, { period, promotionId, courseId }),
    [courseId, period, promotionId, state],
  );
  const trend = useMemo(
    () => getAttendanceTrend(state, { period, promotionId, courseId }),
    [courseId, period, promotionId, state],
  );
  const completed = sessions.filter((session) => session.status !== "SCHEDULED");
  const expected = completed.reduce((total, session) => total + session.expectedCount, 0);
  const checked = completed.reduce((total, session) => total + session.presentCount, 0);
  const attendanceRate = expected ? Math.round((checked / expected) * 100) : 0;
  const lateCount = trend.reduce((total, point) => total + point.late, 0);

  const comparison = state.promotions.map((promotion) => {
    const courseIds = state.courses.filter((course) => course.promotionId === promotion.id).map((course) => course.id);
    const promotionSessions = completed.filter((session) => courseIds.includes(session.courseId));
    const promotionExpected = promotionSessions.reduce((total, session) => total + session.expectedCount, 0);
    const promotionPresent = promotionSessions.reduce((total, session) => total + session.presentCount, 0);
    return { name: promotion.name, taux: promotionExpected ? Math.round((promotionPresent / promotionExpected) * 100) : 0 };
  }).filter((item) => item.taux > 0);

  function exportCsv() {
    const rows = [
      ["Date", "Cours", "Promotion", "Enseignant", "Statut", "Présents", "Attendus", "Taux"],
      ...sessions.map((session) => [
        session.date,
        `${session.courseCode} - ${session.courseName}`,
        session.promotion,
        session.teacher,
        session.status,
        session.presentCount,
        session.expectedCount,
        session.expectedCount ? `${Math.round((session.presentCount / session.expectedCount) * 100)}%` : "0%",
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `statistiques-presence-${period.toLocaleLowerCase("fr")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Export CSV généré selon les filtres actifs.");
  }

  const metrics = [
    { label: "Présence moyenne", value: `${attendanceRate}%`, detail: `${checked} pointages confirmés`, icon: TrendingUp },
    { label: "Sessions analysées", value: completed.length, detail: `période ${period === "7D" ? "7 jours" : period === "30D" ? "30 jours" : "semestre"}`, icon: CalendarCheck },
    { label: "Participations attendues", value: expected, detail: "sur les séances terminées", icon: Users },
    { label: "Retards estimés", value: lateCount, detail: "selon les pointages disponibles", icon: ClockAlert },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Statistiques" description="Explorez les tendances de présence et exportez exactement la vue affichée." action={<Button onClick={exportCsv} disabled={!sessions.length}><Download />Exporter en CSV</Button>} />

      <div className="grid gap-3 border bg-background p-4 md:grid-cols-3">
        <Select value={period} onValueChange={(value) => setPeriod(value as StatisticsPeriod)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="7D">7 derniers jours</SelectItem><SelectItem value="30D">30 derniers jours</SelectItem><SelectItem value="SEMESTER">Semestre</SelectItem></SelectContent>
        </Select>
        <Select value={promotionId || "ALL"} onValueChange={(value) => { setPromotionId(value === "ALL" ? "" : value); setCourseId(""); }}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Toutes les promotions" /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">Toutes les promotions</SelectItem>{state.promotions.map((promotion) => <SelectItem key={promotion.id} value={promotion.id}>{promotion.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={courseId || "ALL"} onValueChange={(value) => setCourseId(value === "ALL" ? "" : value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Tous les cours" /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">Tous les cours</SelectItem>{state.courses.filter((course) => !promotionId || course.promotionId === promotionId).map((course) => <SelectItem key={course.id} value={course.id}>{course.code} · {course.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <Card size="sm" key={metric.label}><CardContent className="flex items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">{metric.label}</p><p className="metric-number mt-2 text-2xl font-semibold">{metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p></div><span className="flex size-9 items-center justify-center bg-primary/8 text-primary"><metric.icon className="size-4" /></span></CardContent></Card>)}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <div className="border bg-background p-4">
          <div className="mb-5"><h2 className="font-semibold">Évolution du taux de présence</h2><p className="mt-1 text-xs text-muted-foreground">Chaque point représente une session réalisée.</p></div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [`${value}%`, "Présence"]} />
                <Line type="monotone" dataKey="rate" stroke="#07864b" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border bg-background p-4">
          <div className="mb-5"><h2 className="font-semibold">Comparaison par promotion</h2><p className="mt-1 text-xs text-muted-foreground">Taux moyen sur la sélection.</p></div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison} layout="vertical" margin={{ top: 8, right: 12, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [`${value}%`, "Présence"]} />
                <Bar dataKey="taux" fill="#65b6d6" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
