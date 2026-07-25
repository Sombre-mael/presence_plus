"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  Clock3,
  FileQuestion,
  Search,
  Send,
  UserRound,
  XCircle,
} from "lucide-react";
import type { AttendanceStatus } from "@/types";
import { useAcademicData } from "@/components/admin/admin-data-provider";
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
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { getStudentHistory, getStudentStats } from "@/lib/student-domain";

const studentId = "u4";

export function StudentHistory() {
  const { state } = useAcademicData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [courseId, setCourseId] = useState("ALL");
  const history = getStudentHistory(state, studentId);
  const stats = getStudentStats(state, studentId);
  const courses = state.courses.filter((course) => course.promotionId === "p2");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return history.filter(({ session, attendance }) =>
      (!normalized || `${session.courseCode} ${session.courseName} ${session.teacher}`.toLocaleLowerCase("fr").includes(normalized)) &&
      (status === "ALL" || attendance?.status === status) &&
      (courseId === "ALL" || session.courseId === courseId));
  }, [courseId, history, query, status]);

  return (
    <div>
      <PageHeader title="Mon historique" description="Comprenez chaque pointage et suivez vos éventuelles demandes de correction." />

      <section className="mb-6 grid gap-px overflow-hidden border bg-border sm:grid-cols-3">
        {[["Présence", `${stats.attendanceRate}%`, "retards inclus"], ["Ponctualité", `${stats.punctualityRate}%`, "sur les séances suivies"], ["Justifiées", stats.excusedCount, "exclues du taux"]].map(([label, value, detail]) => <div key={String(label)} className="bg-background p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="metric-number mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>)}
      </section>

      <div className="border bg-background">
        <div className="grid gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_190px_190px]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cours ou enseignant..." className="pl-9" /></div>
          <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Tous les statuts</SelectItem><SelectItem value="PRESENT">Présent</SelectItem><SelectItem value="LATE">En retard</SelectItem><SelectItem value="ABSENT">Absent</SelectItem><SelectItem value="EXCUSED">Justifiée</SelectItem></SelectContent></Select>
          <Select value={courseId} onValueChange={setCourseId}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Tous les cours</SelectItem>{courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.code}</SelectItem>)}</SelectContent></Select>
        </div>

        <div className="divide-y">
          {filtered.map(({ session, attendance, request }) => (
            <Sheet key={session.id}>
              <SheetTrigger asChild>
                <button className="grid w-full gap-3 p-4 text-left transition-colors hover:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_150px_130px] sm:items-center">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{session.courseName}</p><p className="mt-1 text-xs text-muted-foreground">{session.courseCode} · {session.teacher}</p></div>
                  <div><p className="metric-number text-sm">{session.date}</p><p className="mt-1 text-xs text-muted-foreground">{attendance?.checkedInAt ?? "Non pointé"}</p></div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end"><StatusBadge status={attendance?.status ?? "ABSENT"} />{request?.status === "PENDING" && <StatusBadge status="PENDING_REQUEST" />}</div>
                </button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto sm:max-w-md">
                <SheetHeader><SheetTitle>{session.courseName}</SheetTitle><SheetDescription>{session.courseCode} · {session.promotion}</SheetDescription></SheetHeader>
                <div className="space-y-6 px-4 pb-6">
                  <div className="grid gap-4 border-y py-4">
                    <Info icon={CalendarClock} label="Séance" value={`${session.date} · ${session.startTime}-${session.endTime}`} />
                    <Info icon={UserRound} label="Enseignant" value={session.teacher} />
                    <Info icon={Clock3} label="Pointage" value={attendance?.checkedInAt ? `${attendance.checkedInAt} · ${sourceLabel(attendance.source)}` : "Aucun pointage"} />
                  </div>
                  <div><p className="mb-2 text-xs text-muted-foreground">Résultat</p><StatusBadge status={attendance?.status ?? "ABSENT"} />{attendance?.note && <p className="mt-3 border-l-2 pl-3 text-sm leading-6 text-muted-foreground">{attendance.note}</p>}{attendance?.correctionReason && <p className="mt-3 text-xs leading-5 text-muted-foreground">Dernière correction: {attendance.correctionReason}</p>}</div>

                  {request && <RequestStatus request={request} />}
                  {request?.status === "PENDING" ? <PendingRequest requestId={request.id} /> : <CorrectionDialog sessionId={session.id} attendanceStatus={attendance?.status} />}
                </div>
              </SheetContent>
            </Sheet>
          ))}
          {!filtered.length && <p className="p-10 text-center text-sm text-muted-foreground">Aucune séance ne correspond aux filtres.</p>}
        </div>
      </div>
    </div>
  );
}

function CorrectionDialog({ sessionId, attendanceStatus }: { sessionId: string; attendanceStatus?: AttendanceStatus }) {
  const { createCorrectionRequest } = useAcademicData();
  const [open, setOpen] = useState(false);
  const [requestedStatus, setRequestedStatus] = useState<"PRESENT" | "LATE" | "EXCUSED">(
    attendanceStatus === "LATE" ? "PRESENT" : "PRESENT",
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function submit() {
    const result = createCorrectionRequest({ sessionId, studentId, requestedStatus, reason });
    if (result.ok) {
      setOpen(false);
      setReason("");
      setError("");
    } else setError(result.message);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" className="w-full"><FileQuestion /> Demander une correction</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Demande de correction</DialogTitle><DialogDescription>Indiquez le statut attendu et expliquez précisément la situation.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Statut souhaité</Label><Select value={requestedStatus} onValueChange={(value) => setRequestedStatus(value as typeof requestedStatus)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PRESENT">Présent</SelectItem><SelectItem value="LATE">En retard</SelectItem><SelectItem value="EXCUSED">Absence justifiée</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Motif</Label><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Décrivez ce qui doit être vérifié…" /></div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter><DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose><Button onClick={submit}><Send /> Envoyer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PendingRequest({ requestId }: { requestId: string }) {
  const { cancelCorrectionRequest } = useAcademicData();
  return <Button variant="ghost" className="w-full text-destructive" onClick={() => cancelCorrectionRequest(requestId, studentId)}><XCircle /> Annuler la demande</Button>;
}

function RequestStatus({ request }: { request: ReturnType<typeof getStudentHistory>[number]["request"] }) {
  if (!request) return null;
  return <div className="border bg-muted/30 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">Demande de correction</p><StatusBadge status={request.status === "PENDING" ? "PENDING_REQUEST" : request.status} /></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{request.reason}</p>{request.decisionReason && <p className="mt-3 border-t pt-3 text-xs leading-5 text-muted-foreground">Décision: {request.decisionReason}</p>}</div>;
}

function Info({ icon: Icon, label, value }: { icon: typeof CalendarClock; label: string; value: string }) {
  return <div className="flex gap-3"><Icon className="size-4 text-primary" /><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div></div>;
}

function sourceLabel(source?: string) {
  if (source === "QR") return "QR caméra";
  if (source === "STUDENT_CODE") return "Code manuel";
  if (source === "MANUAL") return "Saisie enseignant";
  return "Source inconnue";
}
