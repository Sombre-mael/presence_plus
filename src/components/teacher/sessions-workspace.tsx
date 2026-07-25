"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { CalendarDays, List, Plus, Search } from "lucide-react";
import { useAcademicData } from "@/components/admin/admin-data-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const teacherId = "u2";

export function SessionsWorkspace() {
  const { state } = useAcademicData();
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [courseId, setCourseId] = useState("ALL");
  const [date, setDate] = useState("");

  const courses = state.courses.filter((course) => course.teacherId === teacherId);
  const sessions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return state.sessions
      .filter((session) => session.teacherId === teacherId)
      .filter((session) =>
        (!normalized || `${session.courseCode} ${session.courseName} ${session.promotion} ${session.room}`.toLocaleLowerCase("fr").includes(normalized)) &&
        (status === "ALL" || session.status === status) &&
        (courseId === "ALL" || session.courseId === courseId) &&
        (!date || session.date === date))
      .sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`));
  }, [courseId, date, query, state.sessions, status]);

  const calendarDate = new Date("2026-07-01T12:00:00");
  const firstOffset = (calendarDate.getDay() + 6) % 7;
  const days = Array.from({ length: 35 }, (_, index) => index - firstOffset + 1);

  return (
    <div>
      <PageHeader
        title="Mes sessions"
        description="Planifiez vos séances, ouvrez le pointage et retrouvez leur historique."
        action={<Button asChild><Link href="/teacher/sessions/new"><Plus /> Nouvelle session</Link></Button>}
      />

      <Tabs defaultValue="list" className="flex-col gap-4">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <TabsList>
            <TabsTrigger value="list"><List /> Liste</TabsTrigger>
            <TabsTrigger value="calendar"><CalendarDays /> Calendrier</TabsTrigger>
          </TabsList>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[260px_160px_180px_160px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cours, promotion, salle..." className="pl-9" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="SCHEDULED">Planifiées</SelectItem>
                <SelectItem value="ACTIVE">Actives</SelectItem>
                <SelectItem value="COMPLETED">Clôturées</SelectItem>
                <SelectItem value="CANCELLED">Annulées</SelectItem>
              </SelectContent>
            </Select>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Cours" /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">Tous les cours</SelectItem>{courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.code}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Filtrer par date" />
          </div>
        </div>

        <TabsContent value="list">
          <div className="divide-y border bg-background">
            {sessions.map((session, index) => {
              const rate = session.expectedCount ? Math.round(session.presentCount / session.expectedCount * 100) : 0;
              return (
                <motion.div key={session.id} initial={reduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : index * 0.025 }}>
                  <Link href={`/teacher/sessions/${session.id}`} className="grid gap-3 p-4 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,1.3fr)_minmax(190px,.8fr)_130px_120px] md:items-center">
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{session.courseName}</p><p className="mt-1 truncate text-xs text-muted-foreground">{session.courseCode} · {session.promotion}</p></div>
                    <div><p className="metric-number text-sm">{session.date} · {session.startTime}</p><p className="mt-1 text-xs text-muted-foreground">Salle {session.room}</p></div>
                    <div><p className="metric-number text-sm font-medium">{session.presentCount}/{session.expectedCount}</p><p className="mt-1 text-xs text-muted-foreground">{rate}% de participation</p></div>
                    <div className="md:justify-self-end"><StatusBadge status={session.status} /></div>
                  </Link>
                </motion.div>
              );
            })}
            {!sessions.length && <div className="p-10 text-center"><CalendarDays className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Aucune session trouvée</p><p className="mt-1 text-xs text-muted-foreground">Modifiez vos filtres ou planifiez une nouvelle séance.</p></div>}
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <div className="border bg-background">
            <div className="flex items-center justify-between border-b p-4"><div><h2 className="font-semibold">Juillet 2026</h2><p className="text-xs text-muted-foreground">Sélectionnez une séance pour l’ouvrir.</p></div><CalendarDays className="size-5 text-primary" /></div>
            <div className="grid grid-cols-7 border-b bg-muted/40">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => <div key={day} className="p-2 text-center text-[11px] font-medium text-muted-foreground">{day}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const daySessions = day > 0 ? sessions.filter((session) => Number(session.date.slice(-2)) === day) : [];
                return (
                  <div key={`${day}-${index}`} className="min-h-24 border-b border-r p-1.5 sm:min-h-28 sm:p-2">
                    {day > 0 && day <= 31 && <><span className="metric-number text-xs text-muted-foreground">{day}</span><div className="mt-1 space-y-1">{daySessions.map((session) => <Link key={session.id} href={`/teacher/sessions/${session.id}`} className="block truncate bg-primary/8 px-1.5 py-1 text-[10px] font-medium text-primary sm:text-xs">{session.startTime} {session.courseCode}</Link>)}</div></>}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
