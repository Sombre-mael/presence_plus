"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarDays, CircleUserRound, GraduationCap, Radio, Users } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useAdminData } from "@/components/admin/admin-data-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const statIcons = [CircleUserRound, Users, CalendarDays, GraduationCap];

export default function AdminDashboardPage() {
  const { state, stats, anomalies } = useAdminData();
  const reduceMotion = useReducedMotion();
  const recentSessions = state.sessions.slice(0, 4);
  const metrics = [
    { label: "Comptes actifs", value: stats.activeUsers, detail: `${stats.totalUsers} comptes au total`, href: "/admin/users" },
    { label: "Présence moyenne", value: `${stats.attendanceRate}%`, detail: "sessions réalisées", href: "/admin/statistics" },
    { label: "Sessions aujourd’hui", value: stats.sessionsToday, detail: `${stats.activeSessions} en cours`, href: "/admin/sessions?date=2026-07-25" },
    { label: "Promotions", value: stats.promotionCount, detail: `${stats.studentCount} étudiants enregistrés`, href: "/admin/promotions" },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        title="Pilotage académique"
        description="Les informations qui demandent une décision aujourd’hui, réunies au même endroit."
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
                <p className="text-xs text-muted-foreground">{session.date} · {session.startTime}</p>
                <div className="flex justify-start sm:justify-end"><StatusBadge status={session.status} /></div>
              </Link>
            ))}
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
    </div>
  );
}
