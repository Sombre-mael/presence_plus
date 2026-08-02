"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Edit3,
  MapPin,
  Play,
  QrCode,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useAcademicData } from "@/components/admin/admin-data-provider";
import { getSessionRoster } from "@/lib/academic-domain";
import { academicDateTimeKey, currentAcademicDateTimeKey } from "@/lib/academic-calendar";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function TeacherSessionDetail({ id }: { id: string }) {
  const { state, viewerId: teacherId, startSession, cancelSession, completeSession, isPending } = useAcademicData();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const session = state.sessions.find((item) => item.id === id && item.teacherId === teacherId);

  if (!session) {
    return <div className="py-16 text-center"><h1 className="text-xl font-semibold">Session introuvable</h1><p className="mt-2 text-sm text-muted-foreground">Cette séance n’existe pas ou ne vous est pas affectée.</p><Button asChild variant="outline" className="mt-5"><Link href="/teacher/sessions"><ArrowLeft /> Retour aux sessions</Link></Button></div>;
  }

  const roster = getSessionRoster(state, id);
  const records = roster.filter((item) => item.attendance);
  const pending = roster.length - records.length;
  const present = records.filter((item) => ["PRESENT", "LATE"].includes(item.attendance!.status)).length;
  const rate = roster.length ? Math.round(present / roster.length * 100) : 0;
  const activeExpired = session.status === "ACTIVE" && academicDateTimeKey(session.date, session.endTime) <= currentAcademicDateTimeKey();

  async function start() {
    const result = await startSession(id);
    if (result.ok) router.push(`/teacher/sessions/${id}/qr`);
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/teacher/sessions"><ArrowLeft /> Retour aux sessions</Link></Button>
      <PageHeader
        title={session.name || session.courseName}
        description={`${session.courseCode} · ${session.courseName} · ${session.promotion}`}
        action={<StatusBadge status={session.status} />}
      />

      {session.status === "SCHEDULED" && (
        <ActionBand
          title="La séance est prête"
          description="Vérifiez les informations puis ouvrez le pointage au début du cours."
          actions={<>
            <Button asChild variant="outline"><Link href={`/teacher/sessions/${id}/edit`}><Edit3 /> Modifier</Link></Button>
            <CancelDialog reason={reason} setReason={setReason} pending={isPending(`session:${id}:cancel`)} onConfirm={() => cancelSession(id, reason)} />
            <Dialog><DialogTrigger asChild><Button><Play /> Démarrer</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Ouvrir le pointage ?</DialogTitle><DialogDescription>Le QR code deviendra actif et les informations de la séance seront verrouillées.</DialogDescription></DialogHeader><DialogFooter><DialogClose asChild><Button variant="outline">Retour</Button></DialogClose><Button disabled={isPending(`session:${id}:start`)} onClick={start}>{isPending(`session:${id}:start`) ? "Démarrage..." : "Démarrer la session"}</Button></DialogFooter></DialogContent></Dialog>
          </>}
        />
      )}

      {session.status === "ACTIVE" && (
        <ActionBand
          title={activeExpired ? "Horaire terminé, clôture requise" : "Pointage en cours"}
          description={activeExpired ? `${pending} étudiant(s) sans pointage seront marqués absents à la clôture.` : `${pending} étudiant(s) n’ont pas encore pointé. La clôture les marquera absents.`}
          actions={<>
            <Button asChild variant="outline"><Link href={`/teacher/sessions/${id}/attendances`}><UserCheck /> Présences</Link></Button>
            {!activeExpired && <Button asChild><Link href={`/teacher/sessions/${id}/qr`}><QrCode /> QR code</Link></Button>}
            <CloseDialog count={pending} mutating={isPending(`session:${id}:complete`)} onConfirm={() => completeSession(id)} />
          </>}
        />
      )}

      {session.status === "COMPLETED" && (
        <ActionBand title="Séance clôturée" description="Les résultats sont archivés. Toute correction demandera un motif." actions={<Button asChild><Link href={`/teacher/sessions/${id}/attendances`}><UserCheck /> Consulter et corriger</Link></Button>} />
      )}

      {session.status === "CANCELLED" && (
        <div className="border border-red-200 bg-red-50 p-4 text-red-900"><div className="flex gap-3"><XCircle className="size-5 shrink-0" /><div><p className="font-medium">Session annulée</p><p className="mt-1 text-sm text-red-800/80">{session.cancellationReason}</p></div></div></div>
      )}

      <section className="grid gap-px overflow-hidden border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: CalendarClock, label: "Date", value: session.date },
          { icon: Clock3, label: "Horaire", value: `${session.startTime} – ${session.endTime}` },
          { icon: MapPin, label: "Salle", value: session.room },
          { icon: Users, label: "Promotion", value: session.promotion },
        ].map((item) => <div key={item.label} className="flex gap-3 bg-background p-4"><item.icon className="size-4 text-primary" /><div><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 text-sm font-medium">{item.value}</p></div></div>)}
      </section>
      {session.description && <section className="border bg-background p-4"><h2 className="text-sm font-semibold">À propos de la séance</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{session.description}</p></section>}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="border bg-background">
          <div className="flex items-center justify-between border-b p-4"><div><h2 className="font-semibold">Derniers pointages</h2><p className="mt-1 text-xs text-muted-foreground">Les arrivées les plus récentes</p></div><Button asChild variant="ghost" size="sm"><Link href={`/teacher/sessions/${id}/attendances`}>Voir la liste</Link></Button></div>
          <div className="divide-y">
            {records.sort((a, b) => (b.attendance?.checkedInAt ?? "").localeCompare(a.attendance?.checkedInAt ?? "")).slice(0, 5).map(({ student, attendance }) => <div key={student.id} className="flex items-center gap-3 p-4"><span className="flex size-9 items-center justify-center bg-muted text-xs font-semibold">{student.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{student.name}</p><p className="text-xs text-muted-foreground">{student.matricule} · {attendance?.checkedInAt ?? "Sans heure"}</p></div><StatusBadge status={attendance!.status} /></div>)}
            {!records.length && <p className="p-8 text-center text-sm text-muted-foreground">Aucun pointage enregistré.</p>}
          </div>
        </div>
        <div className="border bg-background p-5">
          <h2 className="font-semibold">Participation</h2>
          <p className="metric-number mt-5 text-4xl font-semibold">{rate}%</p>
          <p className="mt-1 text-sm text-muted-foreground">{present} sur {roster.length} étudiants</p>
          <div className="mt-5 h-2 bg-muted"><div className="h-full bg-primary transition-[width]" style={{ width: `${rate}%` }} /></div>
          <div className="mt-6 grid grid-cols-2 gap-3 border-t pt-4 text-sm"><div><p className="metric-number font-semibold">{records.length}</p><p className="text-xs text-muted-foreground">traités</p></div><div><p className="metric-number font-semibold">{pending}</p><p className="text-xs text-muted-foreground">en attente</p></div></div>
        </div>
      </section>
    </div>
  );
}

function ActionBand({ title, description, actions }: { title: string; description: string; actions: React.ReactNode }) {
  return <section className="flex flex-col gap-4 border bg-emerald-50/50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><div className="flex flex-wrap gap-2">{actions}</div></section>;
}

function CancelDialog({ reason, setReason, onConfirm, pending }: { reason: string; setReason: (value: string) => void; onConfirm: () => Promise<{ ok: boolean; message: string }>; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  async function confirm() { const result = await onConfirm(); if (result.ok) { setOpen(false); setError(""); } else setError(result.message); }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline"><XCircle /> Annuler la séance</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Annuler cette séance ?</DialogTitle><DialogDescription>Elle restera visible dans l’historique. Un motif est obligatoire pour informer les étudiants.</DialogDescription></DialogHeader><Textarea value={reason} onChange={(event) => { setReason(event.target.value); setError(""); }} placeholder="Motif de l’annulation" aria-label="Motif de l’annulation" aria-invalid={Boolean(error)} /><p className="text-xs text-muted-foreground">5 caractères minimum</p>{error && <p className="text-xs text-destructive">{error}</p>}<DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Retour</Button><Button variant="destructive" disabled={pending || reason.trim().length < 5} onClick={confirm}>{pending ? "Annulation..." : "Confirmer l’annulation"}</Button></DialogFooter></DialogContent></Dialog>;
}

function CloseDialog({ count, onConfirm, mutating }: { count: number; onConfirm: () => Promise<{ ok: boolean; message: string }>; mutating: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  async function confirm() { const result = await onConfirm(); if (result.ok) { setOpen(false); setError(""); } else setError(result.message); }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="destructive"><CheckCircle2 /> Clôturer</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Clôturer la session ?</DialogTitle><DialogDescription>{count} étudiant(s) sans pointage seront automatiquement marqués absents. Cette action est définitive.</DialogDescription></DialogHeader>{error && <p className="text-xs text-destructive">{error}</p>}<DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Continuer le pointage</Button><Button variant="destructive" disabled={mutating} onClick={confirm}>{mutating ? "Clôture..." : "Clôturer la session"}</Button></DialogFooter></DialogContent></Dialog>;
}
