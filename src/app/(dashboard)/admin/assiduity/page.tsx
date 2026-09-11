import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Download, Search, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminAssiduityPage } from "@/lib/admin-attendance.server";
import { getViewerForRole } from "@/lib/authenticated-viewer";
import type { AdminAssiduityFilters } from "@/types/admin-attendance";

export const metadata: Metadata = { title: "Assiduité · Presence Plus" };

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function AdminAssiduityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const viewer = await getViewerForRole("ADMIN");
  if (!viewer) redirect("/login");
  const raw = await searchParams;
  const filters: AdminAssiduityFilters = { query: first(raw.q), promotionId: first(raw.promotion), courseId: first(raw.course), teacherId: first(raw.teacher), period: (first(raw.period) as AdminAssiduityFilters["period"]) ?? "30", situation: (first(raw.situation) as AdminAssiduityFilters["situation"]) ?? "ALL", page: Number(first(raw.page) ?? 1) };
  const data = await getAdminAssiduityPage(filters);
  const exportParams = new URLSearchParams(Object.entries({ kind: "assiduity", query: filters.query, promotionId: filters.promotionId, courseId: filters.courseId, teacherId: filters.teacherId, attendancePeriod: filters.period, situation: filters.situation }).flatMap(([key, value]) => value ? [[key, String(value)]] : []));
  const pageHref = (page: number) => { const params = new URLSearchParams(Object.entries(raw).flatMap(([key, value]) => first(value) ? [[key, first(value)!]] : [])); params.set("page", String(page)); return `?${params}`; };

  return <div className="min-w-0 space-y-6">
    <PageHeader title="Assiduité" description="Vue consolidée des présences enregistrées pour les cours de la faculté." action={<Button asChild variant="outline"><a href={`/api/exports?${exportParams}`}><Download />Exporter la vue</a></Button>} />
    <section aria-label="Bilan" className="grid gap-px overflow-hidden border bg-border sm:grid-cols-4">
      {[ ["Étudiants", data.summary.students, "dans la vue"], ["Présence", data.summary.attendanceRate === null ? "—" : `${data.summary.attendanceRate} %`, "retards inclus"], ["À suivre", data.summary.attentionCount, `sous ${data.threshold} %`], ["À vérifier", data.summary.missingCount, "résultats manquants"] ].map(([label, value, detail]) => <div key={label} className="bg-background p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="metric-number mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>)}
    </section>
    <section className="border bg-background">
      <form className="grid gap-3 border-b p-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="relative xl:col-span-2"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={filters.query} className="pl-9" placeholder="Nom ou matricule" aria-label="Rechercher un étudiant" /></div>
        <FilterSelect name="promotion" value={filters.promotionId} label="Toutes les promotions" options={data.options.promotions.map((item) => [item.id, item.name])} />
        <FilterSelect name="course" value={filters.courseId} label="Tous les cours" options={data.options.courses.map((item) => [item.id, `${item.code} · ${item.name}`])} />
        <FilterSelect name="teacher" value={filters.teacherId} label="Tous les enseignants" options={data.options.teachers.map((item) => [item.id, item.name])} />
        <div className="flex gap-2"><select name="period" defaultValue={filters.period} aria-label="Période" className="min-h-10 min-w-0 flex-1 border bg-background px-3 text-sm"><option value="30">30 jours</option><option value="90">90 jours</option><option value="180">180 jours</option><option value="ALL">Tout l’historique</option></select><Button type="submit">Filtrer</Button></div>
        <select name="situation" defaultValue={filters.situation} aria-label="Situation" className="min-h-10 border bg-background px-3 text-sm"><option value="ALL">Toutes les situations</option><option value="ATTENTION">À suivre</option><option value="REGULAR">Régulier</option><option value="NO_DATA">Sans résultat</option><option value="MISSING">À vérifier</option></select>
      </form>
      <p aria-live="polite" className="border-b px-4 py-3 text-xs text-muted-foreground">{data.total} suivi(s) étudiant-cours · page {data.page} sur {Math.max(1, Math.ceil(data.total / data.pageSize))}</p>
      <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_repeat(3,minmax(90px,1fr))] gap-4 border-b bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground lg:grid"><span>Étudiant</span><span>Cours</span><span>Présence</span><span>Ponctualité</span><span>Situation</span></div>
      <div className="divide-y">{data.items.map((row) => <article key={row.key} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_repeat(3,minmax(90px,1fr))] lg:items-center"><div className="min-w-0"><p className="break-words text-sm font-semibold">{row.studentName}</p><p className="mt-1 text-xs text-muted-foreground">{row.matricule} · {row.promotionName}</p></div><div><p className="text-sm font-medium">{row.courseCode}</p><p className="mt-1 text-xs text-muted-foreground">{row.courseName} · {row.teacherName}</p></div><Metric label="Présence" value={row.attendanceRate === null ? "—" : `${row.attendanceRate} %`} detail={`${row.present + row.late}/${row.present + row.late + row.absent}`} /><Metric label="Ponctualité" value={row.punctualityRate === null ? "—" : `${row.punctualityRate} %`} detail={`${row.late} retard(s)`} /><div><p className="text-xs text-muted-foreground lg:hidden">Situation</p><span className={`inline-flex px-2 py-1 text-xs font-medium ${row.situation === "ATTENTION" ? "bg-amber-100 text-amber-900" : row.situation === "REGULAR" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>{row.situation === "ATTENTION" ? "À suivre" : row.situation === "REGULAR" ? "Régulier" : "Sans résultat"}</span>{row.missing ? <p className="mt-2 text-xs text-amber-800">{row.missing} résultat(s) manquant(s)</p> : null}</div></article>)}{!data.items.length ? <div className="p-10 text-center"><Users className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">Aucun suivi dans cette vue</p><p className="mt-2 text-sm text-muted-foreground">Modifiez les filtres ou vérifiez que des séances ont été clôturées.</p></div> : null}</div>
      {data.total > data.pageSize ? <div className="flex items-center justify-between border-t p-4"><Button asChild variant="outline" disabled={data.page <= 1}><Link href={pageHref(Math.max(1, data.page - 1))}>Précédent</Link></Button><Button asChild variant="outline" disabled={data.page * data.pageSize >= data.total}><Link href={pageHref(data.page + 1)}>Suivant</Link></Button></div> : null}
    </section>
    <p className="flex gap-2 text-xs leading-5 text-muted-foreground"><AlertTriangle className="mt-0.5 size-4 shrink-0" />Les absences justifiées sont exclues du taux. Les lignes « à vérifier » signalent un effectif clôturé sans résultat définitif.</p>
  </div>;
}

function FilterSelect({ name, value, label, options }: { name: string; value?: string; label: string; options: [string, string][] }) { return <select name={name} defaultValue={value ?? ""} aria-label={label} className="min-h-10 min-w-0 border bg-background px-3 text-sm"><option value="">{label}</option>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select>; }
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div><p className="text-xs text-muted-foreground lg:hidden">{label}</p><p className="metric-number text-sm font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>; }
