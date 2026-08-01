"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Clock3, MapPin, UserRound } from "lucide-react";
import { useAcademicData } from "@/components/admin/admin-data-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStudentSessions } from "@/lib/student-domain";
import { academicMonth, academicMonthGrid, academicWeek, addAcademicDays, currentAcademicDate, formatAcademicDay, formatAcademicMonth, shiftAcademicMonth } from "@/lib/academic-calendar";

export function StudentSchedule() {
  const { state, viewerId: studentId } = useAcademicData();
  const [courseId, setCourseId] = useState("ALL");
  const [weekAnchor, setWeekAnchor] = useState(currentAcademicDate);
  const [month, setMonth] = useState(() => academicMonth());
  const allSessions = getStudentSessions(state, studentId);
  const sessions = useMemo(
    () => allSessions.filter((session) => courseId === "ALL" || session.courseId === courseId),
    [allSessions, courseId],
  );
  const student = state.users.find((user) => user.id === studentId);
  const courses = state.courses.filter((course) => course.promotionId === student?.promotionId);
  const weekDays = academicWeek(weekAnchor).map((date) => ({ date, label: formatAcademicDay(date, { weekday: "long", day: "numeric" }) }));
  const days = academicMonthGrid(month);

  return (
    <div>
      <PageHeader
        title="Mon planning"
        description="Retrouvez les séances de votre promotion et leur état en temps réel."
        action={<Select value={courseId} onValueChange={setCourseId}><SelectTrigger className="w-full sm:w-52" aria-label="Filtrer par cours"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Tous mes cours</SelectItem>{courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.code}</SelectItem>)}</SelectContent></Select>}
      />

      <Tabs defaultValue="agenda" className="flex-col gap-4">
        <TabsList>
          <TabsTrigger value="agenda"><CalendarRange /> Semaine</TabsTrigger>
          <TabsTrigger value="month"><CalendarDays /> Mois</TabsTrigger>
        </TabsList>
        <TabsContent value="agenda">
          <div className="border bg-background">
            <div className="flex items-center justify-between gap-3 border-b p-4"><div><h2 className="font-semibold">Semaine du {formatAcademicDay(weekDays[0].date, { day: "numeric", month: "long" })} au {formatAcademicDay(weekDays[6].date, { day: "numeric", month: "long" })}</h2><p className="mt-1 text-xs text-muted-foreground">Les séances annulées restent visibles pour éviter toute ambiguïté.</p></div><div className="flex gap-1"><Button variant="outline" size="icon-sm" onClick={() => setWeekAnchor((date) => addAcademicDays(date, -7))} aria-label="Semaine précédente"><ChevronLeft /></Button><Button variant="outline" size="icon-sm" onClick={() => setWeekAnchor((date) => addAcademicDays(date, 7))} aria-label="Semaine suivante"><ChevronRight /></Button></div></div>
            <div className="divide-y">
              {weekDays.map((day) => {
                const daySessions = sessions.filter((session) => session.date === day.date);
                return (
                  <section key={day.date} className="grid sm:grid-cols-[150px_minmax(0,1fr)]">
                    <div className="border-b bg-muted/30 p-4 sm:border-b-0 sm:border-r"><p className="text-sm font-medium">{day.label}</p><p className="metric-number mt-1 text-xs text-muted-foreground">{day.date}</p></div>
                    <div className="divide-y">
                      {daySessions.map((session) => (
                        <div key={session.id} className={`p-4 ${session.status === "CANCELLED" ? "opacity-60" : ""}`}>
                          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className={`font-medium ${session.status === "CANCELLED" ? "line-through" : ""}`}>{session.courseName}</p><p className="mt-1 text-xs text-muted-foreground">{session.courseCode}</p></div><StatusBadge status={session.status} /></div>
                          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Clock3 className="size-3.5" />{session.startTime} – {session.endTime}</span><span className="flex items-center gap-1.5"><MapPin className="size-3.5" />Salle {session.room}</span><span className="flex items-center gap-1.5"><UserRound className="size-3.5" />{session.teacher}</span></div>
                        </div>
                      ))}
                      {!daySessions.length && <p className="p-4 text-sm text-muted-foreground">Aucune séance.</p>}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="month">
          <div className="border bg-background">
            <div className="flex items-center justify-between gap-3 border-b p-4"><div><h2 className="font-semibold">{formatAcademicMonth(month)}</h2><p className="mt-1 text-xs text-muted-foreground">Vue générale des cours de {state.promotions.find((promotion) => promotion.id === student?.promotionId)?.name ?? "votre promotion"}.</p></div><div className="flex gap-1"><Button variant="outline" size="icon-sm" onClick={() => setMonth((value) => shiftAcademicMonth(value, -1))} aria-label="Mois précédent"><ChevronLeft /></Button><Button variant="outline" size="icon-sm" onClick={() => setMonth((value) => shiftAcademicMonth(value, 1))} aria-label="Mois suivant"><ChevronRight /></Button></div></div>
            <div className="grid grid-cols-7 border-b bg-muted/40">{["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => <div key={day} className="p-2 text-center text-[11px] font-medium text-muted-foreground">{day}</div>)}</div>
            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const daySessions = day ? sessions.filter((session) => session.date === day) : [];
                return <div key={`${day ?? "empty"}-${index}`} className="min-h-24 border-b border-r p-1.5 sm:min-h-28 sm:p-2">{day && <><span className="metric-number text-xs text-muted-foreground">{Number(day.slice(-2))}</span><div className="mt-1 space-y-1">{daySessions.map((session) => <div key={session.id} className={`truncate px-1.5 py-1 text-[10px] font-medium sm:text-xs ${session.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : session.status === "CANCELLED" ? "bg-red-50 text-red-700 line-through" : "bg-primary/8 text-primary"}`}>{session.startTime} {session.courseCode}</div>)}</div></>}</div>;
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
