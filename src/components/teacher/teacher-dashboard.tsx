"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Activity,
  BookOpen,
  CalendarDays,
  ClockAlert,
  QrCode,
  TimerReset,
  UserCheck,
} from "lucide-react";
import { useAcademicData } from "@/components/admin/admin-data-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { getTeacherNotifications, getTeacherStats } from "@/lib/academic-domain";
import { getTeacherCorrectionNotifications } from "@/lib/student-domain";
import { academicDateTimeKey, currentAcademicDateTimeKey } from "@/lib/academic-calendar";
import { attendancePolicyOf } from "@/lib/attendance-policy";

export function TeacherDashboard() {
  const { state, viewerId: teacherId } = useAcademicData();
  const reduceMotion = useReducedMotion();
  const teacherSessions = state.sessions
    .filter((session) => session.teacherId === teacherId)
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const teacher = state.users.find((user) => user.id === teacherId);
  const nowKey = currentAcademicDateTimeKey();
  const active = teacherSessions.find((session) => session.status === "ACTIVE");
  const activeExpired = active ? academicDateTimeKey(active.date, active.endTime) <= nowKey : false;
  const upcoming = teacherSessions.filter((session) =>
    session.status === "SCHEDULED" && academicDateTimeKey(session.date, session.startTime) > nowKey,
  ).slice(0, 3);
  const stats = getTeacherStats(state, teacherId);
  const alertThreshold = attendancePolicyOf(state.attendancePolicy).attendanceAlertThreshold;
  const teacherCourses = state.courses.filter((course) => course.teacherId === teacherId && course.active !== false);
  const courseInsights = teacherCourses.map((course) => {
    const sessions = teacherSessions.filter((session) => session.courseId === course.id && session.status === "COMPLETED");
    const sessionIds = new Set(sessions.map((session) => session.id));
    const records = state.attendances.filter((record) => sessionIds.has(record.sessionId));
    const excused = records.filter((record) => record.status === "EXCUSED").length;
    const expected = Math.max(0, sessions.reduce((total, session) => total + session.expectedCount, 0) - excused);
    const attended = records.filter((record) => ["PRESENT", "LATE"].includes(record.status)).length;
    return { ...course, sessions: sessions.length, rate: expected ? Math.round((attended / expected) * 100) : undefined };
  }).sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101));
  const attention = [
    ...getTeacherCorrectionNotifications(state, teacherId),
    ...getTeacherNotifications(state, teacherId),
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        title={`Bonjour ${teacher?.name.split(" ")[0] ?? ""}`.trim()}
        description="Pilotez vos séances, contrôlez les pointages et suivez l’assiduité de vos groupes."
        action={<div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/teacher/assiduity"><Activity /> Voir l’assiduité</Link></Button><Button asChild><Link href="/teacher/sessions/new"><CalendarDays /> Planifier</Link></Button></div>}
      />

      <section className="grid gap-px overflow-hidden border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Séances ce mois", value: stats.sessionsThisMonth, detail: "planifiées et réalisées", icon: CalendarDays },
          { label: "Présence moyenne", value: stats.trackedCount ? `${stats.attendanceRate}%` : "—", detail: "sur vos séances clôturées", icon: UserCheck },
          { label: "Retards", value: stats.lateCount, detail: "pointages après tolérance", icon: TimerReset },
          { label: "Session active", value: stats.activeCount, detail: active?.courseCode ?? "aucune en cours", icon: QrCode },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : index * 0.04 }}
            className="bg-background p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs text-muted-foreground">{item.label}</p><p className="metric-number mt-2 text-2xl font-semibold">{item.value}</p></div>
              <item.icon className="size-4 text-primary" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p>
          </motion.div>
        ))}
      </section>

      {active ? (
        <section className="overflow-hidden border bg-background">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2"><StatusBadge status="ACTIVE" /><span className="text-xs text-muted-foreground">{activeExpired ? "Horaire dépassé" : "Pointage ouvert"}</span></div>
              <h2 className="mt-4 text-xl font-semibold">{active.courseName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{active.courseCode} · {active.promotion} · Salle {active.room}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {activeExpired ? <Button asChild><Link href={`/teacher/sessions/${active.id}`}><ClockAlert /> Clôturer la session</Link></Button> : <Button asChild><Link href={`/teacher/sessions/${active.id}/qr`}><QrCode /> Afficher le QR</Link></Button>}
                <Button asChild variant="outline"><Link href={`/teacher/sessions/${active.id}/attendances`}><UserCheck /> Voir les présences</Link></Button>
              </div>
            </div>
            <div className="border-t bg-emerald-50/60 p-5 lg:border-l lg:border-t-0">
              <p className="text-sm font-medium">Progression en direct</p>
              <p className="metric-number mt-3 text-4xl font-semibold text-emerald-800">{active.presentCount}/{active.expectedCount}</p>
              <p className="mt-1 text-xs text-emerald-800/70">étudiants présents ou en retard</p>
              <div className="mt-5 h-2 bg-white">
                <motion.div
                  initial={reduceMotion ? false : { width: 0 }}
                  animate={{ width: `${active.expectedCount ? Math.round(active.presentCount / active.expectedCount * 100) : 0}%` }}
                  className="h-full bg-emerald-600"
                />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="border bg-background p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center bg-blue-50 text-blue-700"><CalendarDays className="size-5" /></span>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Prochaine action</p>
                <h2 className="mt-1 font-semibold">{upcoming[0] ? `${upcoming[0].courseCode} · ${upcoming[0].date} à ${upcoming[0].startTime}` : "Aucune séance planifiée"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{upcoming[0] ? `${upcoming[0].promotion} · Salle ${upcoming[0].room}` : "Ajoutez une séance pour préparer votre prochain pointage."}</p>
              </div>
            </div>
            <Button asChild variant={upcoming[0] ? "outline" : "default"}>
              <Link href={upcoming[0] ? `/teacher/sessions/${upcoming[0].id}` : "/teacher/sessions/new"}>{upcoming[0] ? "Ouvrir la séance" : "Planifier"}<ArrowRight /></Link>
            </Button>
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div><h2 className="font-semibold">Prochaines séances</h2><p className="text-xs text-muted-foreground">Votre planning à venir</p></div>
            <Button asChild variant="ghost" size="sm"><Link href="/teacher/sessions">Tout le planning <ArrowRight /></Link></Button>
          </div>
          <div className="divide-y border bg-background">
            {upcoming.map((session) => (
              <Link key={session.id} href={`/teacher/sessions/${session.id}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50">
                <div className="w-14 text-center"><p className="metric-number text-sm font-semibold">{session.startTime}</p><p className="text-[11px] text-muted-foreground">{session.date.slice(5)}</p></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{session.courseName}</p><p className="mt-1 truncate text-xs text-muted-foreground">{session.promotion} · Salle {session.room}</p></div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
            {!upcoming.length && <p className="p-8 text-center text-sm text-muted-foreground">Aucune séance planifiée.</p>}
          </div>
        </section>

        <section>
          <div className="mb-3"><h2 className="font-semibold">À surveiller</h2><p className="text-xs text-muted-foreground">Les actions qui demandent votre attention</p></div>
          <div className="divide-y border bg-background">
            {attention.map((item) => (
              <Link key={item.id} href={item.href} className="flex gap-3 p-4 transition-colors hover:bg-muted/50">
                <ClockAlert className={item.severity === "HIGH" ? "size-4 text-red-600" : "size-4 text-amber-600"} />
                <div><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p></div>
              </Link>
            ))}
            {!attention.length && <p className="p-8 text-center text-sm text-muted-foreground">Tout est à jour.</p>}
          </div>
        </section>
      </div>

      <section aria-labelledby="course-follow-up-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><h2 id="course-follow-up-heading" className="font-semibold">Suivi par cours</h2><p className="mt-1 text-xs text-muted-foreground">Les taux confirmés sur vos séances clôturées.</p></div>
          <Button asChild variant="ghost" size="sm"><Link href="/teacher/assiduity">Analyse complète <ArrowRight /></Link></Button>
        </div>
        {courseInsights.length ? (
          <div className="grid overflow-hidden border bg-border sm:grid-cols-2 xl:grid-cols-3">
            {courseInsights.slice(0, 6).map((course) => (
              <Link key={course.id} href={`/teacher/assiduity?course=${course.id}`} className="group bg-background p-4 transition-colors hover:bg-muted/50">
                <div className="flex items-start justify-between gap-3"><span className="flex min-w-0 items-center gap-2"><BookOpen className="size-4 shrink-0 text-primary" /><span className="truncate text-sm font-medium">{course.code} · {course.name}</span></span><ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></div>
                <div className="mt-4 flex items-end justify-between gap-3"><div><p className="metric-number text-2xl font-semibold">{course.rate === undefined ? "—" : `${course.rate}%`}</p><p className="mt-1 text-xs text-muted-foreground">{course.sessions} séance(s) clôturée(s)</p></div><span className={`text-xs font-medium ${course.rate !== undefined && course.rate < alertThreshold ? "text-amber-700" : "text-emerald-700"}`}>{course.rate === undefined ? "En attente" : course.rate < alertThreshold ? "À surveiller" : "Régulier"}</span></div>
                <div className="mt-3 h-1.5 overflow-hidden bg-muted" aria-hidden="true"><div className={course.rate !== undefined && course.rate < alertThreshold ? "h-full bg-amber-600" : "h-full bg-emerald-600"} style={{ width: `${course.rate ?? 0}%` }} /></div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="border border-dashed bg-background p-8 text-center text-sm text-muted-foreground">Aucun cours actif ne vous est encore affecté.</div>
        )}
      </section>
    </div>
  );
}
