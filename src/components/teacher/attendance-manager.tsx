"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, MessageSquareText, Pencil, Plus, Search, UserCheck } from "lucide-react";
import type { AttendanceStatus } from "@/types";
import { useAcademicData } from "@/components/admin/admin-data-provider";
import { CorrectionDecisionDialog } from "@/components/teacher/correction-decision-dialog";
import { deriveAttendanceStatus, getSessionRoster } from "@/lib/academic-domain";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type FilterStatus = AttendanceStatus | "PENDING" | "ALL";

export function AttendanceManager({ sessionId, highlightedRequestId }: { sessionId: string; highlightedRequestId?: string }) {
  const { state, viewerId: teacherId } = useAcademicData();
  const session = state.sessions.find((item) => item.id === sessionId && item.teacherId === teacherId);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FilterStatus>("ALL");

  const roster = useMemo(
    () => session ? getSessionRoster(state, sessionId) : [],
    [session, sessionId, state],
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return roster.filter(({ student, attendance }) => {
      const current = attendance?.status ?? "PENDING";
      return (!normalized || `${student.name} ${student.matricule}`.toLocaleLowerCase("fr").includes(normalized)) &&
        (status === "ALL" || current === status);
    });
  }, [query, roster, status]);

  if (!session) return <p className="py-16 text-center text-sm text-muted-foreground">Session introuvable.</p>;
  const canEdit = ["ACTIVE", "COMPLETED"].includes(session.status);
  const pendingRequests = state.correctionRequests
    .filter((request) => request.sessionId === sessionId && request.status === "PENDING")
    .sort((a, b) => Number(b.id === highlightedRequestId) - Number(a.id === highlightedRequestId));

  const exportParams = new URLSearchParams({ sessionId, status, query });

  return (
    <div>
      <PageHeader
        title="Présences de la session"
        description={`${session.courseName} · ${session.date} · ${roster.length} étudiant(s) inscrit(s)`}
        action={<div className="flex flex-wrap gap-2"><Button asChild variant="outline"><a href={`/api/exports?${exportParams}`}><Download /> Exporter le résultat</a></Button>{canEdit && <AttendanceDialog sessionId={sessionId} />}</div>}
      />

      {pendingRequests.length > 0 && (
        <section className="mb-6 border border-amber-200 bg-amber-50/50">
          <div className="flex items-center gap-3 border-b border-amber-200 p-4"><MessageSquareText className="size-5 text-amber-700" /><div><h2 className="font-semibold">Demandes de correction</h2><p className="text-xs text-muted-foreground">{pendingRequests.length} demande(s) à traiter pour cette séance.</p></div></div>
          <div className="divide-y divide-amber-200">
            {pendingRequests.map((request) => {
              const student = state.users.find((user) => user.id === request.studentId);
              return <div key={request.id} className={`grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center ${request.id === highlightedRequestId ? "bg-amber-100/70" : ""}`}><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{student?.name}</p><StatusBadge status={request.requestedStatus} /></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{request.reason}</p></div><CorrectionDecisionDialog request={request} /></div>;
            })}
          </div>
        </section>
      )}

      <div className="border bg-background">
        <div className="grid gap-3 border-b p-4 sm:grid-cols-[minmax(220px,1fr)_200px]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom ou matricule..." className="pl-9" /></div>
          <Select value={status} onValueChange={(value) => setStatus(value as FilterStatus)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Tous les statuts</SelectItem><SelectItem value="PENDING">En attente</SelectItem><SelectItem value="PRESENT">Présents</SelectItem><SelectItem value="LATE">Retards</SelectItem><SelectItem value="ABSENT">Absents</SelectItem><SelectItem value="EXCUSED">Justifiés</SelectItem></SelectContent></Select>
        </div>

        <div className="divide-y">
          {filtered.map(({ student, attendance }) => (
            <div key={student.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_150px_130px_44px] sm:items-center">
              <div className="min-w-0"><p className="truncate text-sm font-medium">{student.name}</p><p className="mt-1 text-xs text-muted-foreground">{student.matricule} · {session.promotion}</p></div>
              <div><p className="metric-number text-sm">{attendance?.checkedInAt ?? "—"}</p><p className="mt-1 text-xs text-muted-foreground">{attendance?.source === "MANUAL" ? "Saisie enseignant" : attendance?.source === "QR" ? "QR caméra" : attendance?.source === "STUDENT_CODE" ? "Code étudiant" : "Non pointé"}</p></div>
              <div>{attendance ? <StatusBadge status={attendance.status} /> : <StatusBadge status="PENDING" />}</div>
              <div>{canEdit && <AttendanceDialog sessionId={sessionId} studentId={student.id} trigger={<Button variant="ghost" size="icon" aria-label={`Modifier ${student.name}`}><Pencil /></Button>} />}</div>
              {(attendance?.note || attendance?.correctionReason) && <div className="sm:col-span-4 border-l-2 border-muted pl-3 text-xs leading-5 text-muted-foreground">{attendance.note}{attendance.correctionReason && <span className="block">Correction: {attendance.correctionReason}</span>}</div>}
            </div>
          ))}
          {!filtered.length && <p className="p-10 text-center text-sm text-muted-foreground">Aucun étudiant ne correspond aux filtres.</p>}
        </div>
      </div>
      <div className="mt-4 text-xs text-muted-foreground"><Button asChild variant="link" className="h-auto p-0"><Link href={`/teacher/sessions/${sessionId}`}>Retour au détail de la session</Link></Button></div>
    </div>
  );
}

function AttendanceDialog({ sessionId, studentId, trigger }: { sessionId: string; studentId?: string; trigger?: React.ReactNode }) {
  const { state, saveAttendance, isPending } = useAcademicData();
  const session = state.sessions.find((item) => item.id === sessionId)!;
  const roster = getSessionRoster(state, sessionId);
  const initial = roster.find((item) => item.student.id === studentId);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(studentId ?? "");
  const [status, setStatus] = useState<AttendanceStatus>(initial?.attendance?.status ?? "PRESENT");
  const [time, setTime] = useState(initial?.attendance?.checkedInAt ?? session.startTime);
  const [note, setNote] = useState(initial?.attendance?.note ?? "");
  const [correctionReason, setCorrectionReason] = useState("");
  const [error, setError] = useState("");
  const selectedAttendance = roster.find((item) => item.student.id === selectedId)?.attendance;

  function selectStudent(value: string) {
    const attendance = roster.find((item) => item.student.id === value)?.attendance;
    setSelectedId(value);
    setStatus(attendance?.status ?? "PRESENT");
    setTime(attendance?.checkedInAt ?? session.startTime);
    setNote(attendance?.note ?? "");
    setCorrectionReason("");
    setError("");
  }

  async function submit() {
    if (!selectedId) {
      setError("Sélectionnez un étudiant.");
      return;
    }
    const automaticStatus = ["PRESENT", "LATE"].includes(status)
      ? deriveAttendanceStatus(session.startTime, time, session.lateThresholdMinutes ?? 10)
      : status;
    const result = await saveAttendance(sessionId, {
      studentId: selectedId,
      status: automaticStatus,
      checkedInAt: ["PRESENT", "LATE"].includes(automaticStatus) ? time : undefined,
      source: "MANUAL",
      note,
      correctionReason,
    });
    if (result.ok) {
      setError("");
      setOpen(false);
    } else {
      setError(result.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button><Plus /> Saisie manuelle</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{session.status === "COMPLETED" || selectedAttendance ? "Corriger une présence" : "Enregistrer une présence"}</DialogTitle><DialogDescription>Les arrivées après {session.lateThresholdMinutes ?? 10} minutes sont automatiquement classées en retard.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label>Étudiant</Label><Select value={selectedId} onValueChange={selectStudent} disabled={Boolean(studentId)}><SelectTrigger className="w-full" aria-label="Étudiant"><SelectValue placeholder="Sélectionner un étudiant" /></SelectTrigger><SelectContent>{roster.map(({ student }) => <SelectItem key={student.id} value={student.id}>{student.name} · {student.matricule}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Statut</Label><Select value={status} onValueChange={(value) => setStatus(value as AttendanceStatus)}><SelectTrigger className="w-full" aria-label="Statut"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PRESENT">Présent</SelectItem><SelectItem value="LATE">En retard</SelectItem><SelectItem value="ABSENT">Absent</SelectItem><SelectItem value="EXCUSED">Absence justifiée</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Heure de pointage</Label><Input type="time" value={time} onChange={(event) => setTime(event.target.value)} disabled={!["PRESENT", "LATE"].includes(status)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Note {status === "EXCUSED" && "(obligatoire)"}</Label><Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Contexte ou justificatif" /></div>
          {session.status === "COMPLETED" && <div className="space-y-2 sm:col-span-2"><Label>Motif de correction</Label><Textarea value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} placeholder="Expliquez pourquoi l’historique est modifié" /><p className="text-xs text-muted-foreground">Obligatoire pour toute modification après clôture.</p></div>}
          {error && <p className="sm:col-span-2 text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter><DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose><Button onClick={submit} disabled={!selectedId || isPending(`attendance:${sessionId}:${selectedId}`)}><UserCheck /> Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
