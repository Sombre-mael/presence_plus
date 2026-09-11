"use client";

import { useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Activity, CalendarCheck, ClockAlert, Download, TrendingUp, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAdminData } from "@/components/admin/admin-data-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAttendanceTrend, getFilteredSessions } from "@/lib/admin-domain";
import { attendancePolicyOf } from "@/lib/attendance-policy";
import type { StatisticsPeriod } from "@/types/admin";

const outcomeMeta = [
  { key: "PRESENT", label: "Présents", className: "bg-emerald-600" },
  { key: "LATE", label: "Retards", className: "bg-amber-600" },
  { key: "ABSENT", label: "Absents", className: "bg-red-600" },
  { key: "EXCUSED", label: "Justifiés", className: "bg-blue-600" },
] as const;

const periodLabels: Record<StatisticsPeriod, string> = {
  "7D": "7 jours",
  "30D": "30 jours",
  "180D": "180 jours",
};

export function StatisticsDashboard() {
  const { state, notify, resetData } = useAdminData();
  const reduceMotion = useReducedMotion();
  const [period, setPeriod] = useState<StatisticsPeriod>("30D");
  const [promotionId, setPromotionId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const alertThreshold = attendancePolicyOf(state.attendancePolicy).attendanceAlertThreshold;
  const filters = useMemo(() => ({ period, promotionId, courseId }), [courseId, period, promotionId]);
  const sessions = useMemo(() => getFilteredSessions(state, filters), [filters, state]);
  const trend = useMemo(() => getAttendanceTrend(state, filters), [filters, state]);
  const completed = sessions.filter((session) => session.status === "COMPLETED");
  const completedIds = new Set(completed.map((session) => session.id));
  const completedRecords = state.attendances.filter((record) => completedIds.has(record.sessionId));
  const outcomeCounts = Object.fromEntries(
    outcomeMeta.map((item) => [item.key, completedRecords.filter((record) => record.status === item.key).length]),
  ) as Record<(typeof outcomeMeta)[number]["key"], number>;
  const expected = Math.max(0, completed.reduce((total, session) => total + session.expectedCount, 0) - outcomeCounts.EXCUSED);
  const checked = outcomeCounts.PRESENT + outcomeCounts.LATE;
  const attendanceRate = expected ? Math.round((checked / expected) * 100) : 0;
  const punctualityRate = checked ? Math.round((outcomeCounts.PRESENT / checked) * 100) : 0;

  const courseComparison = state.courses
    .map((course) => {
      const courseSessions = completed.filter((session) => session.courseId === course.id);
      const sessionIds = new Set(courseSessions.map((session) => session.id));
      const records = completedRecords.filter((record) => sessionIds.has(record.sessionId));
      const excused = records.filter((record) => record.status === "EXCUSED").length;
      const eligible = Math.max(0, courseSessions.reduce((total, session) => total + session.expectedCount, 0) - excused);
      const attended = records.filter((record) => ["PRESENT", "LATE"].includes(record.status)).length;
      return {
        name: course.code,
        label: course.name,
        sessions: courseSessions.length,
        taux: eligible ? Math.round((attended / eligible) * 100) : 0,
      };
    })
    .filter((item) => item.sessions > 0)
    .sort((a, b) => b.taux - a.taux)
    .slice(0, 8);

  async function exportCsv() {
    setExporting(true);
    setExportError("");
    const params = new URLSearchParams({ kind: "statistics", period });
    if (promotionId) params.set("promotionId", promotionId);
    if (courseId) params.set("courseId", courseId);
    try {
      const response = await fetch(`/api/exports?${params}`);
      if (!response.ok) throw new Error("EXPORT_FAILED");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `statistiques-presence-${period.toLowerCase()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      await resetData();
      notify("Export CSV généré selon les filtres actifs.");
    } catch {
      setExportError("L’export n’a pas pu être généré. Réessayez.");
    } finally {
      setExporting(false);
    }
  }

  const metrics = [
    { label: "Présence moyenne", value: expected ? `${attendanceRate}%` : "—", detail: `${checked} présences confirmées`, icon: TrendingUp },
    { label: "Ponctualité", value: checked ? `${punctualityRate}%` : "—", detail: `${outcomeCounts.LATE} retard(s)`, icon: Activity },
    { label: "Sessions analysées", value: completed.length, detail: `sur ${periodLabels[period]}`, icon: CalendarCheck },
    { label: "Participations attendues", value: expected, detail: "hors absences justifiées", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistiques de présence"
        description="Mesurez l’assiduité à partir des séances clôturées et des pointages réellement enregistrés."
        action={<Button onClick={exportCsv} disabled={!completed.length || exporting}><Download />{exporting ? "Génération..." : "Exporter la vue"}</Button>}
      />

      {exportError && <Alert variant="destructive"><AlertDescription>{exportError}</AlertDescription></Alert>}

      <section className="border bg-background p-4" aria-label="Filtres statistiques">
        <div className="grid gap-4 lg:grid-cols-[auto_minmax(180px,1fr)_minmax(220px,1fr)] lg:items-end">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Période</p>
            <div className="flex rounded-md border p-1" role="group" aria-label="Choisir la période">
              {(["7D", "30D", "180D"] as StatisticsPeriod[]).map((value) => (
                <Button key={value} type="button" size="sm" variant={period === value ? "secondary" : "ghost"} className="min-h-9 flex-1 px-3" aria-pressed={period === value} onClick={() => setPeriod(value)}>
                  {periodLabels[value]}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground" htmlFor="statistics-promotion">Promotion</label>
            <Select value={promotionId || "ALL"} onValueChange={(value) => { setPromotionId(value === "ALL" ? "" : value); setCourseId(""); }}>
              <SelectTrigger id="statistics-promotion" className="w-full"><SelectValue placeholder="Toutes les promotions" /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">Toutes les promotions</SelectItem>{state.promotions.map((promotion) => <SelectItem key={promotion.id} value={promotion.id}>{promotion.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground" htmlFor="statistics-course">Cours</label>
            <Select value={courseId || "ALL"} onValueChange={(value) => setCourseId(value === "ALL" ? "" : value)}>
              <SelectTrigger id="statistics-course" className="w-full"><SelectValue placeholder="Tous les cours" /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">Tous les cours</SelectItem>{state.courses.filter((course) => !promotionId || course.promotionId === promotionId).map((course) => <SelectItem key={course.id} value={course.id}>{course.code} · {course.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicateurs statistiques">
        {metrics.map((metric) => <Card size="sm" key={metric.label}><CardContent className="flex items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">{metric.label}</p><p className="metric-number mt-2 text-2xl font-semibold">{metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p></div><span className="flex size-9 items-center justify-center bg-primary/8 text-primary"><metric.icon className="size-4" /></span></CardContent></Card>)}
      </section>

      <section className="border bg-background p-4 sm:p-5" aria-labelledby="outcome-heading">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><h2 id="outcome-heading" className="font-semibold">Répartition des résultats</h2><p className="mt-1 text-xs text-muted-foreground">{completedRecords.length} résultat(s) confirmé(s) dans la sélection.</p></div>
          <span className="text-xs text-muted-foreground">Absences justifiées exclues du taux</span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {outcomeMeta.map((item) => {
            const count = outcomeCounts[item.key];
            const share = completedRecords.length ? Math.round((count / completedRecords.length) * 100) : 0;
            return (
              <div key={item.key}>
                <div className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><span className={`size-2.5 ${item.className}`} />{item.label}</span><strong className="metric-number">{count}</strong></div>
                <div className="mt-2 h-1.5 overflow-hidden bg-muted" aria-hidden="true"><div className={`h-full ${item.className}`} style={{ width: `${share}%` }} /></div>
                <p className="mt-1 text-right text-[11px] text-muted-foreground">{share}% des résultats</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div className="min-w-0 border bg-background p-4 sm:p-5">
          <div className="mb-5"><h2 className="font-semibold">Résultats par séance</h2><p className="mt-1 text-xs text-muted-foreground">Volumes de présence et taux consolidé, séance après séance.</p></div>
          <div className="h-80 w-full" role="img" aria-label="Histogramme des présents, retards et absents par séance, avec courbe du taux de présence">
            {!trend.length ? (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">Aucune séance suivie sur cette période.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend} margin={{ top: 12, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="count" allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="rate" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 4, borderColor: "#d1d5db", boxShadow: "0 8px 24px rgba(15,23,42,.08)" }} />
                  <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine yAxisId="rate" y={alertThreshold} stroke="#dc2626" strokeDasharray="5 4" />
                  <Bar yAxisId="count" dataKey="present" name="Présents" stackId="results" fill="#07864b" isAnimationActive={!reduceMotion} />
                  <Bar yAxisId="count" dataKey="late" name="Retards" stackId="results" fill="#d97706" isAnimationActive={!reduceMotion} />
                  <Bar yAxisId="count" dataKey="absent" name="Absents" stackId="results" fill="#dc2626" radius={[3, 3, 0, 0]} isAnimationActive={!reduceMotion} />
                  <Line yAxisId="rate" type="monotone" dataKey="rate" name="Taux (%)" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: "#fff" }} activeDot={{ r: 5 }} isAnimationActive={!reduceMotion} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="min-w-0 border bg-background p-4 sm:p-5">
          <div className="mb-5"><h2 className="font-semibold">Comparaison par cours</h2><p className="mt-1 text-xs text-muted-foreground">Taux moyen des cours ayant au moins une séance clôturée.</p></div>
          <div className="h-80 w-full" role="img" aria-label="Histogramme horizontal des taux de présence par cours">
            {!courseComparison.length ? (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">Aucune comparaison disponible.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseComparison} layout="vertical" margin={{ top: 4, right: 18, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={66} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [`${value}%`, "Présence"]} labelFormatter={(label) => courseComparison.find((item) => item.name === label)?.label ?? label} contentStyle={{ borderRadius: 4, borderColor: "#d1d5db", boxShadow: "0 8px 24px rgba(15,23,42,.08)" }} />
                  <ReferenceLine x={alertThreshold} stroke="#dc2626" strokeDasharray="5 4" />
                  <Bar dataKey="taux" name="Présence" radius={[0, 3, 3, 0]} background={{ fill: "#f1f5f9" }} isAnimationActive={!reduceMotion}>
                    {courseComparison.map((item) => <Cell key={item.name} fill={item.taux < alertThreshold ? "#d97706" : "#2563eb"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {completed.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><ClockAlert className="size-3.5" />Le repère rouge indique le seuil d’alerte configuré à {alertThreshold} %.</p>
      )}
    </div>
  );
}
