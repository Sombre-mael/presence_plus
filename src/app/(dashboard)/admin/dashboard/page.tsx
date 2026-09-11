"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  MessageSquareText,
  Radio,
  TimerReset,
  UserCheck,
  Users,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useAdminData } from "@/components/admin/admin-data-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { currentAcademicDate, formatAcademicDay } from "@/lib/academic-calendar";

const statIcons = [CircleUserRound, Users, CalendarDays, MessageSquareText];

export default function AdminDashboardPage() {
  const { state, stats, anomalies } = useAdminData();
  const reduceMotion = useReducedMotion();
  const today = currentAcademicDate();
  const recentSessions = [...state.sessions]
    .filter((session) => session.date <= today || session.status === "ACTIVE")
    .sort((a, b) => `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`))
    .slice(0, 4);
  const todaySessions = state.sessions.filter((session) => session.date === today);
  const todayCompletedIds = new Set(todaySessions.filter((session) => session.status === "COMPLETED").map((session) => session.id));
  const todayRecords = state.attendances.filter((record) => todayCompletedIds.has(record.sessionId));
  const pendingCorrections = state.correctionRequests.filter((request) => request.status === "PENDING").length;
  const todayStatus = [
    { label: "Planifiées", value: todaySessions.filter((session) => session.status === "SCHEDULED").length, icon: CalendarCheck, color: "text-blue-700 bg-blue-50" },
    { label: "En cours", value: todaySessions.filter((session) => session.status === "ACTIVE").length, icon: Radio, color: "text-emerald-700 bg-emerald-50" },
    { label: "Clôturées", value: todaySessions.filter((session) => session.status === "COMPLETED").length, icon: CheckCircle2, color: "text-slate-700 bg-slate-100" },
  ];
  const resultStatus = [
    { label: "Présents", value: todayRecords.filter((record) => record.status === "PRESENT").length, className: "bg-emerald-600" },
    { label: "Retards", value: todayRecords.filter((record) => record.status === "LATE").length, className: "bg-amber-600" },
    { label: "Absents", value: todayRecords.filter((record) => record.status === "ABSENT").length, className: "bg-red-600" },
    { label: "Justifiés", value: todayRecords.filter((record) => record.status === "EXCUSED").length, className: "bg-blue-600" },
  ];
  const metrics = [
    { label: "Comptes actifs", value: stats.activeUsers, detail: `${stats.totalUsers} comptes au total`, href: "/admin/users" },
    { label: "Présence moyenne", value: `${stats.attendanceRate}%`, detail: "sessions réalisées", href: "/admin/statistics" },
    { label: "Sessions aujourd’hui", value: stats.sessionsToday, detail: `${stats.activeSessions} en cours`, href: `/admin/sessions?date=${today}` },
    { label: "Corrections en attente", value: pendingCorrections, detail: "demandes à superviser", href: "/admin/corrections?status=PENDING" },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        title="Pilotage des présences"
        description="Suivez l’activité du jour, la qualité des pointages et les décisions qui nécessitent votre attention."
        action={
          <Button asChild>
            <Link href="/admin/sessions">Superviser les sessions <ArrowRight /></Link>
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicateurs principaux">
        {metrics.map((metric, index) => {
          const Icon = statIcons[index];
          return (
            <motion.div
              key={metric.label}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : index * 0.05 }}
            >
              <Link href={metric.href} className="block">
                <Card size="sm" className="h-full transition-colors hover:bg-muted/40">
                  <CardContent>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{metric.label}</p>
                        <p className="metric-number mt-2 text-3xl font-semibold">{metric.value}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
                      </div>
                      <span className="flex size-9 items-center justify-center bg-primary/8 text-primary">
                        <Icon className="size-4" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </section>

      <section className="grid overflow-hidden border bg-background lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]" aria-labelledby="today-heading">
        <div className="p-4 sm:p-5 lg:border-r">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="today-heading" className="font-semibold">Aujourd’hui</h2>
              <p className="mt-1 text-xs text-muted-foreground">{formatAcademicDay(today, { weekday: "long", day: "2-digit", month: "long" })}</p>
            </div>
            <Button asChild variant="ghost" size="sm"><Link href={`/admin/sessions?date=${today}`}>Voir le programme <ArrowRight /></Link></Button>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {todayStatus.map((item) => (
              <div key={item.label} className="border p-3">
                <span className={`flex size-8 items-center justify-center ${item.color}`}><item.icon className="size-4" /></span>
                <p className="metric-number mt-3 text-2xl font-semibold">{item.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t p-4 sm:p-5 lg:border-t-0">
          <div>
            <h2 className="font-semibold">Résultats clôturés</h2>
            <p className="mt-1 text-xs text-muted-foreground">Répartition confirmée des séances du jour.</p>
          </div>
          {todayRecords.length ? (
            <div className="mt-5 space-y-3">
              {resultStatus.map((item) => {
                const share = Math.round((item.value / todayRecords.length) * 100);
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between gap-3 text-xs"><span>{item.label}</span><span className="font-medium">{item.value} · {share}%</span></div>
                    <div className="mt-1.5 h-1.5 overflow-hidden bg-muted" aria-hidden="true"><div className={`h-full ${item.className}`} style={{ width: `${share}%` }} /></div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 flex min-h-28 items-center justify-center border border-dashed px-4 text-center text-sm text-muted-foreground">Les résultats apparaîtront après la clôture des séances.</div>
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Sessions récentes</h2>
              <p className="mt-1 text-xs text-muted-foreground">Lecture opérationnelle des dernières séances.</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/sessions">Tout voir <ArrowRight /></Link>
            </Button>
          </div>
          <div className="overflow-hidden border bg-background">
            {recentSessions.map((session) => (
              <Link
                key={session.id}
                href={`/admin/sessions/${session.id}`}
                className="grid gap-3 border-b p-4 transition-colors last:border-b-0 hover:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_150px_110px] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {session.status === "ACTIVE" && <Radio className="size-3.5 animate-pulse text-emerald-600" />}
                    <p className="truncate text-sm font-medium">{session.courseName}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{session.courseCode} · {session.promotion} · {session.teacher}</p>
                </div>
                <p className="text-xs text-muted-foreground">{formatAcademicDay(session.date, { day: "2-digit", month: "short", year: "numeric" })} · {session.startTime}</p>
                <div className="flex justify-start sm:justify-end"><StatusBadge status={session.status} /></div>
              </Link>
            ))}
            {!recentSessions.length && (
              <div className="p-8 text-center text-sm text-muted-foreground">Aucune session récente à superviser.</div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="font-semibold">À traiter</h2>
            <p className="mt-1 text-xs text-muted-foreground">Classé selon le niveau d’attention.</p>
          </div>
          <div className="border bg-background">
            {anomalies.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Aucune anomalie détectée.</div>
            ) : anomalies.map((anomaly) => (
              <Link key={anomaly.id} href={anomaly.href} className="flex gap-3 border-b p-4 transition-colors last:border-b-0 hover:bg-muted/40">
                <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center ${
                  anomaly.severity === "HIGH" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
                }`}>
                  <AlertTriangle className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{anomaly.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{anomaly.detail}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section aria-labelledby="quick-access-heading">
        <div className="mb-3"><h2 id="quick-access-heading" className="font-semibold">Accès opérationnels</h2><p className="mt-1 text-xs text-muted-foreground">Les vues utiles pour contrôler la qualité du suivi.</p></div>
        <div className="grid overflow-hidden border bg-border sm:grid-cols-2 xl:grid-cols-4">
          {[
            { href: "/admin/assiduity", label: "Assiduité globale", detail: "Repérer les situations sous le seuil", icon: Activity },
            { href: "/admin/corrections?status=PENDING", label: "Corrections", detail: `${pendingCorrections} demande(s) en attente`, icon: MessageSquareText },
            { href: "/admin/statistics", label: "Analyse détaillée", detail: "Comparer périodes, cours et promotions", icon: TimerReset },
            { href: "/admin/sessions", label: "Supervision", detail: "Contrôler les séances et leurs résultats", icon: UserCheck },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="group flex min-h-28 gap-3 bg-background p-4 transition-colors hover:bg-muted/50">
              <item.icon className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="min-w-0"><span className="block text-sm font-medium">{item.label}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.detail}</span></span>
              <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
