"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { CalendarClock, CheckCircle2, Clock3, FileQuestion, Search, XCircle } from "lucide-react";
import type { CorrectionRequestStatus } from "@/types/student";
import { useAcademicData } from "@/components/admin/admin-data-provider";
import { CorrectionDecisionDialog } from "@/components/teacher/correction-decision-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type RequestFilter = CorrectionRequestStatus | "ALL";

export function CorrectionsManager() {
  const { state, viewerId } = useAcademicData();
  const searchParams = useSearchParams();
  const highlightedId = searchParams.get("request") ?? undefined;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RequestFilter>(highlightedId ? "PENDING" : "ALL");
  const [courseId, setCourseId] = useState("ALL");
  const reduceMotion = useReducedMotion();
  const requests = state.correctionRequests.filter((request) => request.teacherId === viewerId);
  const counts = {
    PENDING: requests.filter((request) => request.status === "PENDING").length,
    APPROVED: requests.filter((request) => request.status === "APPROVED").length,
    REJECTED: requests.filter((request) => request.status === "REJECTED").length,
    CANCELLED: requests.filter((request) => request.status === "CANCELLED").length,
  };
  const courses = state.courses.filter((course) => requests.some((request) => state.sessions.find((session) => session.id === request.sessionId)?.courseId === course.id));

  const normalized = query.trim().toLocaleLowerCase("fr");
  const filtered = requests
    .filter((request) => {
      const student = state.users.find((user) => user.id === request.studentId);
      const session = state.sessions.find((item) => item.id === request.sessionId);
      return (status === "ALL" || request.status === status) &&
        (courseId === "ALL" || session?.courseId === courseId) &&
        (!normalized || `${student?.name ?? ""} ${student?.matricule ?? ""} ${session?.courseCode ?? ""} ${session?.courseName ?? ""}`.toLocaleLowerCase("fr").includes(normalized));
    })
    .sort((a, b) => Number(b.id === highlightedId) - Number(a.id === highlightedId) || b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demandes de correction"
        description="Examinez les contestations étudiantes et conservez une décision traçable."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ["À traiter", counts.PENDING, "Demandes nécessitant une décision", Clock3],
          ["Acceptées", counts.APPROVED, "Présences effectivement corrigées", CheckCircle2],
          ["Refusées", counts.REJECTED, "Demandes clôturées avec motif", XCircle],
          ["Annulées", counts.CANCELLED, "Retirées par les étudiants", FileQuestion],
        ] as const).map(([label, value, detail, Icon]) => (
          <Card size="sm" key={label}>
            <CardContent className="flex items-start justify-between gap-3">
              <div><p className="text-sm text-muted-foreground">{label}</p><p className="metric-number mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>
              <span className="flex size-9 items-center justify-center bg-primary/8 text-primary"><Icon className="size-4" /></span>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="border bg-background">
        <div className="space-y-3 border-b p-4">
          <Tabs value={status} onValueChange={(value) => setStatus(value as RequestFilter)}>
            <TabsList className="h-auto w-full justify-start overflow-x-auto">
              <TabsTrigger value="ALL">Toutes <span className="metric-number text-xs">{requests.length}</span></TabsTrigger>
              <TabsTrigger value="PENDING">En attente <span className="metric-number text-xs">{counts.PENDING}</span></TabsTrigger>
              <TabsTrigger value="APPROVED">Acceptées</TabsTrigger>
              <TabsTrigger value="REJECTED">Refusées</TabsTrigger>
              <TabsTrigger value="CANCELLED">Annulées</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_240px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Étudiant, matricule ou cours…" className="pl-9" />
            </div>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">Tous les cours</SelectItem>{courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.code} · {course.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="divide-y">
          {filtered.map((request, index) => {
            const student = state.users.find((user) => user.id === request.studentId);
            const session = state.sessions.find((item) => item.id === request.sessionId);
            const attendance = state.attendances.find((item) => item.sessionId === request.sessionId && item.studentId === request.studentId);
            return (
              <motion.article
                key={request.id}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.2) }}
                className={request.id === highlightedId ? "bg-amber-50/70" : ""}
              >
                <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{student?.name ?? "Étudiant inconnu"}</p><StatusBadge status={request.status === "PENDING" ? "PENDING_REQUEST" : request.status} /></div>
                    <p className="mt-1 text-xs text-muted-foreground">{student?.matricule ?? "Sans matricule"} · {session?.courseCode ?? "Session"} · {session?.courseName}</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{request.reason}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-1">
                    <div><p className="text-xs text-muted-foreground">Statut enregistré</p><div className="mt-1">{attendance ? <StatusBadge status={attendance.status} /> : <span className="inline-flex border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800">À vérifier</span>}</div></div>
                    <div><p className="text-xs text-muted-foreground">Statut demandé</p><div className="mt-1"><StatusBadge status={request.requestedStatus} /></div></div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {request.status === "PENDING" ? <CorrectionDecisionDialog request={request} /> : null}
                    <Button asChild variant="outline"><Link href={`/teacher/sessions/${request.sessionId}/attendances?request=${request.id}`}><CalendarClock /> Voir la séance</Link></Button>
                  </div>
                </div>
                {request.status !== "PENDING" && request.decisionReason ? <div className="border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground">Décision de {request.resolvedByName ?? "l’enseignant"} : {request.decisionReason}</div> : null}
              </motion.article>
            );
          })}
          {!filtered.length ? <div className="px-4 py-14 text-center"><FileQuestion className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">Aucune demande dans cette vue</p><p className="mt-1 text-sm text-muted-foreground">Les nouvelles demandes étudiantes apparaîtront ici.</p></div> : null}
        </div>
      </section>
    </div>
  );
}
