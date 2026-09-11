"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageSquareText,
  QrCode,
  ShieldAlert,
  TimerReset,
  UserCheck,
} from "lucide-react";
import { useAcademicData } from "@/components/admin/admin-data-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import type { AttendanceRecord } from "@/types";
import { getStudentHistory, getStudentSessions, getStudentStats } from "@/lib/student-domain";
import { academicDateTimeKey, currentAcademicDateTimeKey } from "@/lib/academic-calendar";
import { attendancePolicyOf } from "@/lib/attendance-policy";

export function StudentDashboard() {
  const { state, viewerId: studentId } = useAcademicData();
  const reduceMotion = useReducedMotion();
  const stats = getStudentStats(state, studentId);
  const sessions = getStudentSessions(state, studentId);
  const fullHistory = getStudentHistory(state, studentId);
  const history = fullHistory.slice(0, 4);
  const student = state.users.find((user) => user.id === studentId);
  const alertThreshold = attendancePolicyOf(state.attendancePolicy).attendanceAlertThreshold;
  const nowKey = currentAcademicDateTimeKey();
  const active = sessions.find((session) =>
    session.status === "ACTIVE" && academicDateTimeKey(session.date, session.endTime) > nowKey,
  );
  const activeAttendance = active ? state.attendances.find(
    (item) => item.sessionId === active.id && item.studentId === studentId,
  ) : undefined;
  const upcoming = sessions.filter((session) =>
    session.status === "SCHEDULED" && academicDateTimeKey(session.date, session.startTime) > nowKey,
  ).slice(0, 3);
  const courseInsights = [...new Set(fullHistory.map((item) => item.session.courseId))].map((courseId) => {
    const courseHistory = fullHistory.filter((item) => item.session.courseId === courseId);
    const records = courseHistory
      .map((item) => item.attendance)
      .filter((item): item is AttendanceRecord => Boolean(item));
    const eligible = records.filter((record) => record.status !== "EXCUSED");
    const attended = eligible.filter((record) => ["PRESENT", "LATE"].includes(record.status)).length;
    const course = state.courses.find((item) => item.id === courseId);
    return {
      id: courseId,
      code: course?.code ?? courseHistory[0]?.session.courseCode ?? "Cours",
      name: course?.name ?? courseHistory[0]?.session.courseName ?? "Cours",
      rate: eligible.length ? Math.round((attended / eligible.length) * 100) : undefined,
      sessions: courseHistory.length,
      late: eligible.filter((record) => record.status === "LATE").length,
    };
  }).sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101));
  const recentRequests = state.correctionRequests
    .filter((request) => request.studentId === studentId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);

  return (
    <div className="space-y-7">
      <PageHeader
        title={`Bonjour ${student?.name.split(" ")[0] ?? ""}`.trim()}
        description="Retrouvez vos prochaines séances, vos résultats de présence et les corrections en cours."
        action={<div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/student/schedule"><CalendarDays /> Mon planning</Link></Button><Button asChild><Link href="/student/check-in"><QrCode /> Pointer</Link></Button></div>}
      />

      {stats.eligibleCount > 0 && stats.attendanceRate < alertThreshold && (
        <div className="flex gap-3 border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <ShieldAlert className="size-5 shrink-0" />
          <div><p className="text-sm font-semibold">Votre taux de présence est sous {alertThreshold} %</p><p className="mt-1 text-xs leading-5 text-amber-800/80">Consultez votre historique et signalez rapidement toute donnée incorrecte.</p></div>
        </div>
      )}

      {stats.missingCount > 0 && (
        <div className="flex gap-3 border border-sky-200 bg-sky-50 p-4 text-sky-950">
          <ShieldAlert className="size-5 shrink-0" />
          <div><p className="text-sm font-semibold">{stats.missingCount} résultat(s) à vérifier</p><p className="mt-1 text-xs leading-5 text-sky-900/75">Ces séances sont clôturées mais aucun résultat n’est associé à votre profil. Elles ne sont pas comptées dans votre taux.</p></div>
        </div>
      )}

      <section className="grid gap-px overflow-hidden border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Taux de présence", value: stats.eligibleCount ? `${stats.attendanceRate}%` : "—", detail: `${stats.recordedCount} résultat(s) comptabilisé(s)`, icon: UserCheck },
          { label: "Ponctualité", value: stats.attendedCount ? `${stats.punctualityRate}%` : "—", detail: "sur les présences enregistrées", icon: CheckCircle2 },
          { label: "Retards", value: stats.lateCount, detail: "comptés comme présences", icon: TimerReset },
          { label: "Absences", value: stats.absentCount, detail: `${stats.excusedCount} justifiée(s) exclue(s)`, icon: ShieldAlert },
        ].map((item, index) => (
          <motion.div key={item.label} initial={reduceMotion ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : index * 0.04 }} className="bg-background p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{item.label}</p><p className="metric-number mt-2 text-2xl font-semibold">{item.value}</p></div><item.icon className="size-4 text-primary" /></div>
            <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p>
          </motion.div>
        ))}
      </section>

      {active && (
        <section className="overflow-hidden border bg-background">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2"><StatusBadge status="ACTIVE" /><span className="text-xs text-muted-foreground">Séance en cours</span></div>
              <h2 className="mt-4 text-xl font-semibold">{active.courseName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{active.courseCode} · {active.teacher}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Clock3 className="size-4" />{active.startTime} – {active.endTime}</span>
                <span className="flex items-center gap-1.5"><MapPin className="size-4" />Salle {active.room}</span>
              </div>
            </div>
            <div className={`flex flex-col justify-center border-t p-5 lg:border-l lg:border-t-0 ${activeAttendance ? "bg-emerald-50/70" : "bg-amber-50/70"}`}>
              {activeAttendance ? (
                <><CheckCircle2 className="size-6 text-emerald-700" /><p className="mt-3 font-semibold text-emerald-900">Présence enregistrée</p><p className="mt-1 text-sm text-emerald-800/75">{activeAttendance.checkedInAt} · <StatusBadge status={activeAttendance.status} /></p></>
              ) : (
                <><QrCode className="size-6 text-amber-700" /><p className="mt-3 font-semibold text-amber-900">Pointage en attente</p><p className="mt-1 text-sm text-amber-800/75">Le QR code est disponible auprès de l’enseignant.</p><Button asChild className="mt-4"><Link href="/student/check-in">Ouvrir le scanner</Link></Button></>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,.7fr)]">
        <section>
          <div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold">Prochaines séances</h2><p className="text-xs text-muted-foreground">Votre agenda à venir</p></div><Button asChild variant="ghost" size="sm"><Link href="/student/schedule">Voir le planning <ArrowRight /></Link></Button></div>
          <div className="divide-y border bg-background">
            {upcoming.map((session) => <Link key={session.id} href="/student/schedule" className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/40"><div className="w-14 text-center"><p className="metric-number text-sm font-semibold">{session.startTime}</p><p className="text-[11px] text-muted-foreground">{session.date.slice(5)}</p></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{session.courseName}</p><p className="mt-1 truncate text-xs text-muted-foreground">{session.teacher} · Salle {session.room}</p></div><CalendarDays className="size-4 text-muted-foreground" /></Link>)}
            {!upcoming.length && <p className="p-8 text-center text-sm text-muted-foreground">Aucune séance planifiée.</p>}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold">Derniers résultats</h2><p className="text-xs text-muted-foreground">Votre historique récent</p></div><Button asChild variant="ghost" size="sm"><Link href="/student/history">Tout voir <ArrowRight /></Link></Button></div>
          <div className="divide-y border bg-background">
            {history.map(({ session, attendance }) => <Link key={session.id} href="/student/history" className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/40"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{session.courseName}</p><p className="mt-1 text-xs text-muted-foreground">{session.date} · {attendance?.checkedInAt ?? "Résultat manquant"}</p></div>{attendance ? <StatusBadge status={attendance.status} /> : <MissingStatus />}</Link>)}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="student-course-heading">
          <div className="mb-3 flex items-end justify-between gap-3"><div><h2 id="student-course-heading" className="font-semibold">Ma présence par cours</h2><p className="mt-1 text-xs text-muted-foreground">Calculée uniquement sur vos résultats confirmés.</p></div><Button asChild variant="ghost" size="sm"><Link href="/student/history">Détails <ArrowRight /></Link></Button></div>
          {courseInsights.length ? (
            <div className="grid overflow-hidden border bg-border sm:grid-cols-2">
              {courseInsights.slice(0, 6).map((course) => (
                <Link key={course.id} href={`/student/history?course=${course.id}`} className="group bg-background p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-3"><span className="flex min-w-0 items-center gap-2"><BookOpen className="size-4 shrink-0 text-primary" /><span className="truncate text-sm font-medium">{course.code} · {course.name}</span></span><ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></div>
                  <div className="mt-4 flex items-end justify-between gap-3"><div><p className="metric-number text-2xl font-semibold">{course.rate === undefined ? "—" : `${course.rate}%`}</p><p className="mt-1 text-xs text-muted-foreground">{course.sessions} séance(s) · {course.late} retard(s)</p></div><span className={`text-xs font-medium ${course.rate !== undefined && course.rate < alertThreshold ? "text-amber-700" : "text-emerald-700"}`}>{course.rate === undefined ? "Non calculé" : course.rate < alertThreshold ? "À améliorer" : "Bon suivi"}</span></div>
                  <div className="mt-3 h-1.5 overflow-hidden bg-muted" aria-hidden="true"><motion.div initial={reduceMotion ? false : { width: 0 }} animate={{ width: `${course.rate ?? 0}%` }} className={course.rate !== undefined && course.rate < alertThreshold ? "h-full bg-amber-600" : "h-full bg-emerald-600"} /></div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border border-dashed bg-background p-8 text-center"><BookOpen className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Aucun résultat disponible</p><p className="mt-1 text-xs text-muted-foreground">Votre suivi par cours apparaîtra après la première séance clôturée.</p></div>
          )}
        </section>

        <section aria-labelledby="student-corrections-heading">
          <div className="mb-3 flex items-end justify-between gap-3"><div><h2 id="student-corrections-heading" className="font-semibold">Mes corrections</h2><p className="mt-1 text-xs text-muted-foreground">Dernières demandes et décisions.</p></div><Button asChild variant="ghost" size="sm"><Link href="/student/history">Gérer <ArrowRight /></Link></Button></div>
          <div className="divide-y border bg-background">
            {recentRequests.map((request) => {
              const session = state.sessions.find((item) => item.id === request.sessionId);
              const status = {
                PENDING: { label: "En attente", className: "bg-amber-50 text-amber-800" },
                APPROVED: { label: "Acceptée", className: "bg-emerald-50 text-emerald-800" },
                REJECTED: { label: "Refusée", className: "bg-red-50 text-red-800" },
                CANCELLED: { label: "Annulée", className: "bg-slate-100 text-slate-700" },
              }[request.status];
              return (
                <Link key={request.id} href="/student/history" className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/50">
                  <MessageSquareText className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{session?.courseCode ?? "Séance"}</span><span className="mt-1 block text-xs text-muted-foreground">Statut demandé : {request.requestedStatus === "PRESENT" ? "Présent" : request.requestedStatus === "LATE" ? "Retard" : request.requestedStatus === "EXCUSED" ? "Absence justifiée" : "Absent"}</span></span>
                  <span className={`shrink-0 px-2 py-1 text-[11px] font-medium ${status.className}`}>{status.label}</span>
                </Link>
              );
            })}
            {!recentRequests.length && <div className="p-8 text-center"><MessageSquareText className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Aucune demande</p><p className="mt-1 text-xs text-muted-foreground">Une correction peut être demandée depuis l’historique d’une séance clôturée.</p></div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function MissingStatus() {
  return <span className="inline-flex items-center border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800">À vérifier</span>;
}
