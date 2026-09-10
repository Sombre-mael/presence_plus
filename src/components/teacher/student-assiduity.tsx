"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Search, Users } from "lucide-react";
import { useAcademicData } from "@/components/admin/admin-data-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getTeacherAssiduity, getTeacherCourses, type AssiduityPeriod, type TeacherAssiduityRow } from "@/lib/teacher-assiduity";
import { formatAcademicDay } from "@/lib/academic-calendar";

const labels = { REGULAR: "Régulier", ATTENTION: "À suivre", NO_DATA: "Sans résultat" } as const;
const colors = { REGULAR: "bg-emerald-50 text-emerald-800", ATTENTION: "bg-amber-50 text-amber-900", NO_DATA: "bg-muted text-muted-foreground" } as const;
const percent = (value: number | null) => value === null ? "—" : `${value} %`;

export function StudentAssiduity() {
  const { state, viewerId } = useAcademicData();
  const searchParams = useSearchParams();
  const [courseId, setCourseId] = useState(searchParams.get("course") ?? "ALL");
  const [period, setPeriod] = useState<AssiduityPeriod>("ALL");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("ALL");
  const reducedMotion = useReducedMotion();
  const courses = useMemo(() => getTeacherCourses(state, viewerId), [state, viewerId]);
  const rows = useMemo(() => getTeacherAssiduity(state, viewerId, period), [state, viewerId, period]);
  const normalized = query.trim().toLocaleLowerCase("fr");
  const filtered = rows.filter((row) => (courseId === "ALL" || courseId === row.course.id) &&
    (level === "ALL" || level === row.level || (level === "MISSING" && row.counts.MISSING > 0)) &&
    (!normalized || `${row.student.name} ${row.student.matricule ?? ""}`.toLocaleLowerCase("fr").includes(normalized)));
  const eligible = filtered.reduce((sum, row) => sum + row.eligible, 0);
  const attended = filtered.reduce((sum, row) => sum + row.attended, 0);

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title="Assiduité des étudiants" description="Un suivi par étudiant et par cours, à partir des séances clôturées." />
      <section aria-label="Bilan des résultats filtrés" className="grid gap-px overflow-hidden border bg-border sm:grid-cols-3">
        {[
          ["Étudiants", new Set(filtered.map((row) => row.student.id)).size, `${filtered.length} suivi(s) étudiant-cours`],
          ["Présence", eligible ? `${Math.round(100 * attended / eligible)} %` : "—", "Retards inclus · justifiées exclues"],
          ["À suivre", filtered.filter((row) => row.level === "ATTENTION").length, "Suivis avec moins de 80 % de présence"],
        ].map(([label, value, detail]) => <div key={label} className="min-w-0 bg-background p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="metric-number mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>)}
      </section>

      <section className="min-w-0 border bg-background">
        <div className="grid gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0 space-y-2"><Label htmlFor="assiduity-query">Étudiant</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="assiduity-query" className="pl-9" placeholder="Nom ou matricule" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>
          <div className="min-w-0 space-y-2"><Label htmlFor="assiduity-course">Cours</Label><Select value={courseId} onValueChange={setCourseId}><SelectTrigger id="assiduity-course" className="w-full min-w-0 [&>span]:truncate"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Tous mes cours</SelectItem>{courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.code} · {course.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="min-w-0 space-y-2"><Label htmlFor="assiduity-period">Période</Label><Select value={period} onValueChange={(value) => setPeriod(value as AssiduityPeriod)}><SelectTrigger id="assiduity-period" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Tout l’historique</SelectItem><SelectItem value="30">30 derniers jours</SelectItem><SelectItem value="90">90 derniers jours</SelectItem><SelectItem value="180">180 derniers jours</SelectItem></SelectContent></Select></div>
          <div className="min-w-0 space-y-2"><Label htmlFor="assiduity-level">Situation</Label><Select value={level} onValueChange={setLevel}><SelectTrigger id="assiduity-level" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Toutes les situations</SelectItem><SelectItem value="ATTENTION">À suivre</SelectItem><SelectItem value="REGULAR">Régulier</SelectItem><SelectItem value="NO_DATA">Sans résultat</SelectItem><SelectItem value="MISSING">Données à vérifier</SelectItem></SelectContent></Select></div>
        </div>
        <p aria-live="polite" className="border-b px-4 py-3 text-xs text-muted-foreground">{filtered.length} résultat(s) · Une ligne par étudiant et par cours.</p>
        <div className="hidden grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_120px] gap-4 border-b bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground lg:grid" aria-hidden="true"><span>Étudiant / cours</span><span>Présence</span><span>Ponctualité</span><span>Retards / absences</span><span>Situation</span></div>
        <div className="divide-y">
          {filtered.map((row, index) => <motion.div key={row.key} initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.02, 0.16) }}>
            <AssiduityDetail row={row}>
              <button className="grid w-full min-w-0 grid-cols-2 gap-4 p-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-primary lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_120px] lg:items-center" aria-label={`Voir l’assiduité de ${row.student.name} en ${row.course.code}`}>
                <div className="col-span-2 min-w-0 lg:col-span-1"><p className="break-words text-sm font-semibold">{row.student.name}</p><p className="mt-1 break-words text-xs text-muted-foreground">{row.student.matricule ?? "Sans matricule"} · {row.course.code}</p><p className="mt-1 break-words text-xs text-muted-foreground">{row.course.name}{!row.currentEnrollment ? " · Historique" : ""}</p>{row.counts.MISSING > 0 && <p className="mt-2 text-xs text-amber-800">{row.counts.MISSING} résultat(s) à vérifier</p>}</div>
                <div><p className="text-xs text-muted-foreground lg:hidden">Présence</p><p className="metric-number text-sm font-semibold">{percent(row.attendanceRate)}</p><p className="mt-1 text-xs text-muted-foreground">{row.attended} / {row.eligible} séances comptées</p></div>
                <div><p className="text-xs text-muted-foreground lg:hidden">Ponctualité</p><p className="metric-number text-sm">{percent(row.punctualityRate)}</p><p className="mt-1 text-xs text-muted-foreground">{row.counts.EXCUSED} justifiée(s)</p></div>
                <div className="text-xs"><p>{row.counts.LATE} retard(s)</p><p className="mt-1">{row.counts.ABSENT} absence(s)</p></div>
                <div className="flex items-center justify-between gap-2"><span className={`inline-flex px-2 py-1 text-xs font-medium ${colors[row.level]}`}>{labels[row.level]}</span><ArrowUpRight className="size-4 shrink-0 text-muted-foreground" /></div>
              </button>
            </AssiduityDetail>
          </motion.div>)}
          {!filtered.length && <div className="px-4 py-12 text-center"><Users className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">Aucun suivi dans cette vue</p><p className="mt-2 text-sm text-muted-foreground">{courses.length ? "Aucun étudiant ne correspond aux filtres sélectionnés." : "Aucun cours ou historique de séance ne vous est affecté."}</p>{courses.length > 0 && <Button className="mt-4" variant="outline" onClick={() => { setQuery(""); setCourseId("ALL"); setLevel("ALL"); setPeriod("ALL"); }}>Réinitialiser les filtres</Button>}</div>}
        </div>
      </section>
      <p className="text-xs leading-5 text-muted-foreground">Présence = présents et retards / présents, retards et absents. Ponctualité = présents à l’heure / présences. Les séances annulées, en cours, les absences justifiées et les résultats manquants ne pénalisent pas le taux. « À suivre » est un repère à 80 %, pas une sanction.</p>
    </div>
  );
}

function AssiduityDetail({ row, children }: { row: TeacherAssiduityRow; children: React.ReactNode }) {
  return <Sheet><SheetTrigger asChild>{children}</SheetTrigger><SheetContent className="w-full overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle className="break-words">{row.student.name}</SheetTitle><SheetDescription className="break-words">{row.course.code} · {row.course.name}</SheetDescription></SheetHeader><div className="space-y-4 px-4 pb-6"><div className="grid grid-cols-2 gap-4 border-y py-4"><div><p className="text-xs text-muted-foreground">Présence</p><p className="mt-1 text-xl font-semibold">{percent(row.attendanceRate)}</p></div><div><p className="text-xs text-muted-foreground">Ponctualité</p><p className="mt-1 text-xl font-semibold">{percent(row.punctualityRate)}</p></div></div><h2 className="text-sm font-semibold">Séances clôturées de la période</h2>{row.history.map(({ session, attendance }) => <article key={session.id} className="space-y-2 border-b pb-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{formatAcademicDay(session.date, { day: "numeric", month: "short", year: "numeric" })}</p>{attendance ? <StatusBadge status={attendance.status} /> : <span className="text-xs text-amber-800">À vérifier</span>}</div><p className="text-xs text-muted-foreground">{session.startTime}–{session.endTime} · {session.name ?? session.courseName}</p>{attendance?.checkedInAt && <p className="text-xs">Pointage : {attendance.checkedInAt}</p>}{attendance?.correctionReason && <p className="break-words text-xs text-muted-foreground">Correction : {attendance.correctionReason}</p>}<Button asChild variant="link" className="h-auto min-h-11 px-0"><Link href={`/teacher/sessions/${session.id}/attendances`}>Voir la feuille de présence <ArrowUpRight /></Link></Button></article>)}{!row.history.length && <p className="py-4 text-sm text-muted-foreground">Aucune séance clôturée associée à cet étudiant sur la période. Aucun taux ne lui est attribué.</p>}</div></SheetContent></Sheet>;
}
