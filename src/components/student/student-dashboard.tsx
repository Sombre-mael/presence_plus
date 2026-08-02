"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  QrCode,
  ShieldAlert,
  TimerReset,
  UserCheck,
} from "lucide-react";
import { useAcademicData } from "@/components/admin/admin-data-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { getStudentHistory, getStudentSessions, getStudentStats } from "@/lib/student-domain";
import { academicDateTimeKey, currentAcademicDateTimeKey } from "@/lib/academic-calendar";

export function StudentDashboard() {
  const { state, viewerId: studentId } = useAcademicData();
  const reduceMotion = useReducedMotion();
  const stats = getStudentStats(state, studentId);
  const sessions = getStudentSessions(state, studentId);
  const history = getStudentHistory(state, studentId).slice(0, 4);
  const student = state.users.find((user) => user.id === studentId);
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

  return (
    <div className="space-y-7">
      <PageHeader
        title={`Bonjour ${student?.name.split(" ")[0] ?? ""}`.trim()}
        description="Suivez vos cours, vos pointages et votre progression académique."
        action={<Button asChild><Link href="/student/check-in"><QrCode /> Pointer maintenant</Link></Button>}
      />

      {stats.eligibleCount > 0 && stats.attendanceRate < 80 && (
        <div className="flex gap-3 border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <ShieldAlert className="size-5 shrink-0" />
          <div><p className="text-sm font-semibold">Votre taux de présence est sous 80 %</p><p className="mt-1 text-xs leading-5 text-amber-800/80">Consultez votre historique et signalez rapidement toute donnée incorrecte.</p></div>
        </div>
      )}

      {stats.missingCount > 0 && (
        <div className="flex gap-3 border border-sky-200 bg-sky-50 p-4 text-sky-950">
          <ShieldAlert className="size-5 shrink-0" />
          <div><p className="text-sm font-semibold">{stats.missingCount} résultat(s) à vérifier</p><p className="mt-1 text-xs leading-5 text-sky-900/75">Ces séances sont clôturées mais aucune présence Neon n’est associée à votre profil. Elles ne sont pas comptées dans votre taux.</p></div>
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
    </div>
  );
}

function MissingStatus() {
  return <span className="inline-flex items-center border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800">À vérifier</span>;
}
