"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarCheck, Clock3, MapPin } from "lucide-react";
import type { TeacherSessionInput } from "@/types/admin";
import { useAcademicData } from "@/components/admin/admin-data-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const teacherId = "u2";

export function TeacherSessionForm({ sessionId }: { sessionId?: string }) {
  const { state, createSession, updateSession } = useAcademicData();
  const router = useRouter();
  const existing = state.sessions.find((session) => session.id === sessionId);
  const courses = state.courses.filter((course) => course.teacherId === teacherId);
  const [input, setInput] = useState<TeacherSessionInput>({
    courseId: existing?.courseId ?? courses[0]?.id ?? "",
    date: existing?.date ?? "2026-07-28",
    startTime: existing?.startTime ?? "08:00",
    endTime: existing?.endTime ?? "10:00",
    room: existing?.room ?? "",
    lateThresholdMinutes: existing?.lateThresholdMinutes ?? 10,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const course = useMemo(() => courses.find((item) => item.id === input.courseId), [courses, input.courseId]);
  const promotion = state.promotions.find((item) => item.id === course?.promotionId);

  function update<K extends keyof TeacherSessionInput>(key: K, value: TeacherSessionInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = sessionId
      ? updateSession(sessionId, input, teacherId)
      : createSession(input, teacherId);
    if (!result.ok) {
      setMessage(result.message);
      setErrors(result.fieldErrors ?? {});
      return;
    }
    const destination = sessionId ?? ("id" in result ? result.id : undefined);
    router.push(destination ? `/teacher/sessions/${destination}` : "/teacher/sessions");
  }

  if (sessionId && (!existing || existing.status !== "SCHEDULED")) {
    return <Alert variant="destructive"><AlertTitle>Modification indisponible</AlertTitle><AlertDescription>Cette session a déjà démarré, a été clôturée ou annulée.</AlertDescription></Alert>;
  }

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,720px)_320px]">
      <div className="border bg-background">
        <div className="border-b p-5"><h2 className="font-semibold">Informations de la séance</h2><p className="mt-1 text-xs text-muted-foreground">Le cours détermine automatiquement la promotion concernée.</p></div>
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Field label="Cours" error={errors.courseId} className="sm:col-span-2">
            <Select value={input.courseId} onValueChange={(value) => update("courseId", value)}>
              <SelectTrigger className="w-full" aria-label="Cours"><SelectValue placeholder="Sélectionner un cours" /></SelectTrigger>
              <SelectContent>{courses.map((item) => <SelectItem key={item.id} value={item.id}>{item.code} · {item.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Promotion" className="sm:col-span-2">
            <Input value={promotion?.name ?? "Aucune promotion liée"} disabled />
          </Field>
          <Field label="Date" error={errors.date}>
            <Input aria-label="Date" type="date" value={input.date} onChange={(event) => update("date", event.target.value)} />
          </Field>
          <Field label="Salle" error={errors.room}>
            <Input aria-label="Salle" value={input.room} onChange={(event) => update("room", event.target.value)} placeholder="Ex. B12" />
          </Field>
          <Field label="Heure de début" error={errors.startTime}>
            <Input aria-label="Heure de début" type="time" value={input.startTime} onChange={(event) => update("startTime", event.target.value)} />
          </Field>
          <Field label="Heure de fin" error={errors.endTime}>
            <Input aria-label="Heure de fin" type="time" value={input.endTime} onChange={(event) => update("endTime", event.target.value)} />
          </Field>
          <Field label="Tolérance de retard (minutes)" error={errors.lateThresholdMinutes} className="sm:col-span-2">
            <Input aria-label="Tolérance de retard" type="number" min={0} max={60} value={input.lateThresholdMinutes} onChange={(event) => update("lateThresholdMinutes", Number(event.target.value))} />
          </Field>
          {message && <Alert variant="destructive" className="sm:col-span-2"><AlertTitle>Impossible d’enregistrer</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}><ArrowLeft /> Annuler</Button>
          <Button type="submit"><CalendarCheck /> {sessionId ? "Enregistrer les modifications" : "Planifier la session"}</Button>
        </div>
      </div>

      <aside className="h-fit border bg-muted/30 p-5">
        <h2 className="font-semibold">Aperçu</h2>
        <div className="mt-5 space-y-4 text-sm">
          <Summary icon={CalendarCheck} label="Cours" value={course ? `${course.code} · ${course.name}` : "À sélectionner"} />
          <Summary icon={Clock3} label="Horaire" value={`${input.date || "Date"} · ${input.startTime}-${input.endTime}`} />
          <Summary icon={MapPin} label="Lieu" value={input.room || "Salle à définir"} />
        </div>
        <p className="mt-5 border-t pt-4 text-xs leading-5 text-muted-foreground">Après le démarrage, les informations de la séance seront verrouillées afin de protéger l’historique.</p>
      </aside>
    </form>
  );
}

function Field({ label, error, children, className = "" }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-2 ${className}`}><Label>{label}</Label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}

function Summary({ icon: Icon, label, value }: { icon: typeof CalendarCheck; label: string; value: string }) {
  return <div className="flex gap-3"><Icon className="mt-0.5 size-4 text-primary" /><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div></div>;
}
