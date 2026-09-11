import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/teacher/print-button";
import { getViewerForRole } from "@/lib/authenticated-viewer";
import { prisma } from "@/lib/prisma";
import { toAcademicDate, toAcademicTime } from "@/lib/academic-repository";

export const metadata: Metadata = { title: "Feuille de présence · Presence Plus" };

export default async function TeacherPrintAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewerForRole("TEACHER");
  if (!viewer) notFound();
  const { id } = await params;
  const session = await prisma.session.findFirst({
    where: { id, teacherId: viewer.id },
    include: {
      courses: true,
      promotion: { include: { users: { where: { role: "STUDENT", status: "ACTIVE" }, orderBy: { name: "asc" } } } },
      enrollments: { include: { student: true }, orderBy: { student: { name: "asc" } } },
      attendances: true,
    },
  });
  if (!session) notFound();
  const students = ["ACTIVE", "COMPLETED"].includes(session.status) ? session.enrollments.map((item) => item.student) : session.promotion.users;
  const attendanceByStudent = new Map(session.attendances.map((item) => [item.studentId, item]));
  return <div className="mx-auto max-w-5xl bg-white p-4 text-black print:p-0 sm:p-8">
    <div className="mb-6 flex flex-col gap-4 border-b-2 border-black pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase">Presence Plus</p><h1 className="mt-2 text-2xl font-bold">Feuille de présence</h1><p className="mt-1 text-sm">Document de secours et de vérification terrain</p></div><PrintButton /></div>
    <dl className="mb-6 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><Info label="Cours" value={`${session.courses.code} · ${session.courses.name}`} /><Info label="Promotion" value={session.promotion.name} /><Info label="Date et heure" value={`${toAcademicDate(session.scheduledStartAt)} · ${toAcademicTime(session.scheduledStartAt)}-${toAcademicTime(session.scheduledEndAt)}`} /><Info label="Salle" value={session.room} /></dl>
    <div className="overflow-hidden border border-black"><div className="grid grid-cols-[44px_minmax(160px,2fr)_minmax(100px,1fr)_100px_minmax(120px,1fr)] border-b border-black bg-slate-100 px-2 py-2 text-xs font-bold"><span>N°</span><span>Étudiant</span><span>Matricule</span><span>Statut</span><span>Signature / note</span></div>{students.map((student, index) => { const attendance = attendanceByStudent.get(student.id); return <div key={student.id} className="grid min-h-11 grid-cols-[44px_minmax(160px,2fr)_minmax(100px,1fr)_100px_minmax(120px,1fr)] border-b border-black px-2 py-2 text-xs last:border-b-0"><span>{index + 1}</span><span className="font-medium">{student.name}</span><span>{student.matricule ?? "—"}</span><span>{attendance ? { PRESENT: "Présent", LATE: "Retard", ABSENT: "Absent", EXCUSED: "Justifié" }[attendance.status] : ""}</span><span>{attendance?.checkedInAt ? toAcademicTime(attendance.checkedInAt) : ""}</span></div>; })}</div>
    <div className="mt-8 grid gap-8 text-sm sm:grid-cols-2"><div><p className="font-semibold">Observations</p><div className="mt-8 border-b border-black" /><div className="mt-8 border-b border-black" /></div><div><p className="font-semibold">Validation de l’enseignant</p><p className="mt-10 border-t border-black pt-2">Nom, signature et date</p></div></div>
    <p className="mt-8 text-xs text-slate-600">Les modifications définitives doivent être reportées dans Presence Plus dès le retour de la connexion afin de conserver une trace auditée.</p>
  </div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold uppercase text-slate-600">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>; }
