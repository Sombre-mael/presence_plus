"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock3, MapPin, Search, UserCheck, Users } from "lucide-react";
import { useAdminData } from "@/components/admin/admin-data-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function SessionsManager({ initialDate = "" }: { initialDate?: string }) {
  const { state } = useAdminData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [promotionId, setPromotionId] = useState("ALL");
  const [courseId, setCourseId] = useState("ALL");
  const [teacherId, setTeacherId] = useState("ALL");
  const [date, setDate] = useState(initialDate);

  const teachers = state.users.filter((user) => user.role === "TEACHER");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return state.sessions.filter((session) => {
      const course = state.courses.find((item) => item.id === session.courseId);
      return (
        (!normalized || `${session.courseCode} ${session.courseName} ${session.teacher} ${session.room}`.toLocaleLowerCase("fr").includes(normalized)) &&
        (status === "ALL" || session.status === status) &&
        (promotionId === "ALL" || course?.promotionId === promotionId) &&
        (courseId === "ALL" || session.courseId === courseId) &&
        (teacherId === "ALL" || course?.teacherId === teacherId) &&
        (!date || session.date === date)
      );
    });
  }, [courseId, date, promotionId, query, state.courses, state.sessions, status, teacherId]);

  return (
    <div>
      <PageHeader
        title="Supervision des sessions"
        description="Consultez le déroulement des séances sans intervenir dans leur pilotage."
      />
      <div className="border bg-background">
        <div className="grid gap-3 border-b p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_160px_190px_190px_190px_170px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cours, enseignant, salle..." className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">Tous les statuts</SelectItem><SelectItem value="ACTIVE">Actives</SelectItem><SelectItem value="SCHEDULED">Planifiées</SelectItem><SelectItem value="COMPLETED">Terminées</SelectItem></SelectContent>
          </Select>
          <Select value={promotionId} onValueChange={setPromotionId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Promotion" /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">Toutes les promotions</SelectItem>{state.promotions.map((promotion) => <SelectItem key={promotion.id} value={promotion.id}>{promotion.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Cours" /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">Tous les cours</SelectItem>{state.courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.code}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={teacherId} onValueChange={setTeacherId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Enseignant" /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">Tous les enseignants</SelectItem>{teachers.map((teacher) => <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Filtrer par date" />
        </div>

        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader><TableRow><TableHead>Session</TableHead><TableHead>Enseignant</TableHead><TableHead>Date et salle</TableHead><TableHead>Progression</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((session) => {
                const rate = session.expectedCount ? Math.round((session.presentCount / session.expectedCount) * 100) : 0;
                return (
                  <TableRow key={session.id}>
                    <TableCell><Link href={`/admin/sessions/${session.id}`} className="block"><span className="block font-medium">{session.courseName}</span><span className="text-xs text-muted-foreground">{session.courseCode} · {session.promotion}</span></Link></TableCell>
                    <TableCell>{session.teacher}</TableCell>
                    <TableCell><span className="block">{session.date} · {session.startTime}</span><span className="text-xs text-muted-foreground">Salle {session.room}</span></TableCell>
                    <TableCell><span className="metric-number font-medium">{session.presentCount}/{session.expectedCount}</span><span className="ml-2 text-xs text-muted-foreground">{rate}%</span></TableCell>
                    <TableCell><StatusBadge status={session.status} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="divide-y md:hidden">
          {filtered.map((session) => {
            const rate = session.expectedCount ? Math.round((session.presentCount / session.expectedCount) * 100) : 0;
            return (
              <Link key={session.id} href={`/admin/sessions/${session.id}`} className="block p-4">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{session.courseName}</p><p className="mt-1 text-xs text-muted-foreground">{session.courseCode} · {session.promotion}</p></div><StatusBadge status={session.status} /></div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>{session.date} · {session.startTime}</span><span className="metric-number font-medium text-foreground">{rate}%</span></div>
              </Link>
            );
          })}
        </div>
        {!filtered.length && <p className="p-8 text-center text-sm text-muted-foreground">Aucune session ne correspond à ces filtres.</p>}
      </div>
    </div>
  );
}

export function AdminSessionDetail({ id }: { id: string }) {
  const { state } = useAdminData();
  const session = state.sessions.find((item) => item.id === id);
  if (!session) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold">Session introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">Cette session n’existe plus dans les données locales.</p>
        <Button asChild variant="outline" className="mt-5"><Link href="/admin/sessions"><ArrowLeft />Retour aux sessions</Link></Button>
      </div>
    );
  }

  const records = state.attendances.filter((attendance) => attendance.sessionId === id);
  const lateCount = Math.max(records.filter((record) => record.status === "LATE").length, Math.round(session.presentCount * 0.08));
  const presentCount = Math.max(0, session.presentCount - lateCount);
  const absentCount = Math.max(0, session.expectedCount - session.presentCount);
  const rate = session.expectedCount ? Math.round((session.presentCount / session.expectedCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/sessions"><ArrowLeft />Retour aux sessions</Link></Button>
      <PageHeader title={session.courseName} description={`${session.courseCode} · ${session.promotion} · supervision en lecture seule`} action={<StatusBadge status={session.status} />} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Horaire", value: `${session.startTime} – ${session.endTime}`, icon: Clock3 },
          { label: "Salle", value: session.room, icon: MapPin },
          { label: "Enseignant", value: session.teacher, icon: Users },
          { label: "Participation", value: `${rate}%`, icon: UserCheck },
        ].map((item) => (
          <Card size="sm" key={item.label}><CardContent className="flex items-center gap-3"><span className="flex size-9 items-center justify-center bg-primary/8 text-primary"><item.icon className="size-4" /></span><div><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 font-medium">{item.value}</p></div></CardContent></Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="border bg-background">
          <div className="border-b p-4"><h2 className="font-semibold">Derniers pointages</h2><p className="mt-1 text-xs text-muted-foreground">Aperçu des enregistrements disponibles pour cette session.</p></div>
          {records.length ? (
            <div className="divide-y">
              {records.map((record) => (
                <div key={record.id} className="flex items-center gap-3 p-4">
                  <span className="flex size-9 items-center justify-center bg-muted text-xs font-semibold">{record.studentName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{record.studentName}</p><p className="text-xs text-muted-foreground">{record.matricule} · {record.checkedInAt ?? "Non pointé"}</p></div>
                  <StatusBadge status={record.status} />
                </div>
              ))}
            </div>
          ) : <p className="p-8 text-center text-sm text-muted-foreground">Aucun pointage individuel disponible.</p>}
        </div>

        <div className="border bg-background p-4">
          <h2 className="font-semibold">Répartition</h2>
          <div className="mt-5 space-y-5">
            {[
              ["Présents", presentCount, "bg-emerald-500"],
              ["Retards", lateCount, "bg-amber-500"],
              ["Absents", absentCount, "bg-red-500"],
            ].map(([label, value, color]) => {
              const percentage = session.expectedCount ? Math.round((Number(value) / session.expectedCount) * 100) : 0;
              return (
                <div key={String(label)}>
                  <div className="mb-2 flex justify-between text-sm"><span>{label}</span><span className="metric-number font-medium">{value} · {percentage}%</span></div>
                  <div className="h-2 bg-muted"><div className={`h-full ${color}`} style={{ width: `${percentage}%` }} /></div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 border-t pt-4 text-xs leading-5 text-muted-foreground">
            L’administrateur peut consulter ces données, mais la correction et la clôture restent réservées à l’enseignant.
          </div>
        </div>
      </section>
    </div>
  );
}
