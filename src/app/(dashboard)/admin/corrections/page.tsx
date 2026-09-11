import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareText, Search } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminCorrectionOverride } from "@/components/admin/admin-correction-override";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminCorrectionPage } from "@/lib/admin-attendance.server";
import { getViewerForRole } from "@/lib/authenticated-viewer";
import type { AdminCorrectionFilters } from "@/types/admin-attendance";

export const metadata: Metadata = { title: "Corrections · Presence Plus" };
type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function AdminCorrectionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const viewer = await getViewerForRole("ADMIN");
  if (!viewer) redirect("/login");
  const raw = await searchParams;
  const filters: AdminCorrectionFilters = { query: first(raw.q), status: (first(raw.status) as AdminCorrectionFilters["status"]) ?? "ALL", promotionId: first(raw.promotion), courseId: first(raw.course), teacherId: first(raw.teacher), page: Number(first(raw.page) ?? 1) };
  const data = await getAdminCorrectionPage(filters);
  const pageHref = (page: number) => { const params = new URLSearchParams(Object.entries(raw).flatMap(([key, value]) => first(value) ? [[key, first(value)!]] : [])); params.set("page", String(page)); return `?${params}`; };
  return <div className="min-w-0 space-y-6">
    <PageHeader title="Corrections de présence" description="Supervisez les demandes et leur traitement par les enseignants." />
    <section className="grid gap-px overflow-hidden border bg-border sm:grid-cols-4">{[["En attente", data.counts.PENDING], ["Acceptées", data.counts.APPROVED], ["Refusées", data.counts.REJECTED], ["Annulées", data.counts.CANCELLED]].map(([label, value]) => <div key={label} className="bg-background p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="metric-number mt-2 text-2xl font-semibold">{value}</p></div>)}</section>
    <section className="border bg-background">
      <form className="grid gap-3 border-b p-4 md:grid-cols-2 xl:grid-cols-6"><div className="relative xl:col-span-2"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={filters.query} className="pl-9" placeholder="Nom ou matricule" aria-label="Rechercher un étudiant" /></div><FilterSelect name="status" value={filters.status === "ALL" ? "" : filters.status} label="Tous les statuts" options={[["PENDING", "En attente"], ["APPROVED", "Acceptées"], ["REJECTED", "Refusées"], ["CANCELLED", "Annulées"]]} /><FilterSelect name="promotion" value={filters.promotionId} label="Toutes les promotions" options={data.options.promotions.map((item) => [item.id, item.name])} /><FilterSelect name="course" value={filters.courseId} label="Tous les cours" options={data.options.courses.map((item) => [item.id, `${item.code} · ${item.name}`])} /><div className="flex gap-2"><FilterSelect name="teacher" value={filters.teacherId} label="Tous les enseignants" options={data.options.teachers.map((item) => [item.id, item.name])} /><Button type="submit">Filtrer</Button></div></form>
      <p className="border-b px-4 py-3 text-xs text-muted-foreground">{data.total} demande(s) · page {data.page} sur {Math.max(1, Math.ceil(data.total / data.pageSize))}</p>
      <div className="divide-y">{data.items.map((request) => <article key={request.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_180px] lg:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{request.studentName}</p><StatusBadge status={request.requestedStatus} /></div><p className="mt-1 text-xs text-muted-foreground">{request.matricule} · {request.promotionName}</p><p className="mt-3 text-sm leading-6">{request.reason}</p>{request.decisionReason ? <p className="mt-2 border-l-2 pl-3 text-xs text-muted-foreground">Décision: {request.decisionReason}</p> : null}</div><div><p className="text-sm font-medium">{request.courseCode} · {request.courseName}</p><p className="mt-1 text-xs text-muted-foreground">{request.sessionDate} · {request.teacherName}</p><Button asChild variant="link" className="mt-2 h-auto p-0"><Link href={`/admin/sessions/${request.sessionId}`}>Voir la séance</Link></Button></div><div className="flex flex-col items-start gap-3 lg:items-end"><StatusBadge status={request.status} />{request.status === "PENDING" ? viewer.adminLevel === "SUPER" ? <AdminCorrectionOverride request={request} /> : <p className="text-xs text-muted-foreground lg:text-right">Décision attendue de l’enseignant</p> : <p className="text-xs text-muted-foreground">Traitée le {request.resolvedAt ? new Date(request.resolvedAt).toLocaleDateString("fr-FR") : "—"}</p>}</div></article>)}{!data.items.length ? <div className="p-10 text-center"><MessageSquareText className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">Aucune demande dans cette vue</p></div> : null}</div>
      {data.total > data.pageSize ? <div className="flex items-center justify-between border-t p-4"><Button asChild variant="outline" disabled={data.page <= 1}><Link href={pageHref(Math.max(1, data.page - 1))}>Précédent</Link></Button><Button asChild variant="outline" disabled={data.page * data.pageSize >= data.total}><Link href={pageHref(data.page + 1)}>Suivant</Link></Button></div> : null}
    </section>
  </div>;
}

function FilterSelect({ name, value, label, options }: { name: string; value?: string; label: string; options: string[][] }) { return <select name={name} defaultValue={value ?? ""} aria-label={label} className="min-h-10 min-w-0 flex-1 border bg-background px-3 text-sm"><option value="">{label}</option>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select>; }
