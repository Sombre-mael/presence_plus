import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAcademicSnapshot } from "@/lib/academic-repository";
import { getDemoViewer } from "@/lib/demo-viewer";
import { prisma } from "@/lib/prisma";
import { getSessionRoster } from "@/lib/academic-domain";
import { addAcademicDays, currentAcademicDate } from "@/lib/academic-calendar";
import { apiFailure, PRIVATE_RESPONSE_HEADERS } from "@/lib/api-response";

const exportQuerySchema = z.object({
  sessionId: z.string().trim().min(1).max(120).optional(),
  kind: z.enum(["attendances", "statistics"]).default("attendances"),
  status: z.enum(["ALL", "PENDING", "PRESENT", "LATE", "ABSENT", "EXCUSED"]).optional(),
  query: z.string().trim().max(120).default(""),
  period: z.enum(["7D", "30D", "180D"]).default("30D"),
  promotionId: z.string().trim().min(1).max(120).optional(),
  courseId: z.string().trim().min(1).max(120).optional(),
});

function csvCell(value: string) {
  const protectedValue = /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
  return `"${protectedValue.replaceAll('"', '""')}"`;
}

async function buildExport(request: NextRequest) {
  const parsed = exportQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return Response.json(
      { error: "Parametres d'export invalides.", details: z.treeifyError(parsed.error) },
      { status: 400, headers: PRIVATE_RESPONSE_HEADERS },
    );
  }
  const { sessionId, kind, status, period, promotionId, courseId } = parsed.data;
  const query = parsed.data.query.toLocaleLowerCase("fr");

  const viewer = await getDemoViewer();
  if (!viewer) return Response.json({ error: "Profil de démonstration requis." }, { status: 401, headers: PRIVATE_RESPONSE_HEADERS });
  const snapshot = await getAcademicSnapshot(viewer);
  if (sessionId && !snapshot.sessions.some((session) => session.id === sessionId)) {
    return Response.json({ error: "Session introuvable." }, { status: 404, headers: PRIVATE_RESPONSE_HEADERS });
  }

  if (kind === "statistics") {
    if (viewer.role !== "ADMIN") return Response.json({ error: "Acces administrateur requis." }, { status: 403, headers: PRIVATE_RESPONSE_HEADERS });
    const days = period === "7D" ? 7 : period === "180D" ? 180 : 30;
    const minimumDate = addAcademicDays(currentAcademicDate(), -(days - 1));
    const sessions = snapshot.sessions.filter((session) =>
      session.status === "COMPLETED" &&
      session.date >= minimumDate &&
      (!promotionId || session.promotionId === promotionId) &&
      (!courseId || session.courseId === courseId));
    const rows = [
      ["Date", "Cours", "Promotion", "Enseignant", "Statut", "Presents", "Retards", "Absents", "Justifies", "Attendus", "Taux"],
      ...sessions.map((session) => {
        const records = snapshot.attendances.filter((record) => record.sessionId === session.id);
        const present = records.filter((record) => record.status === "PRESENT").length;
        const late = records.filter((record) => record.status === "LATE").length;
        const absent = records.filter((record) => record.status === "ABSENT").length;
        const excused = records.filter((record) => record.status === "EXCUSED").length;
        const attended = present + late;
        const eligible = Math.max(0, session.expectedCount - excused);
        return [session.date, `${session.courseCode} - ${session.courseName}`, session.promotion, session.teacher, session.status, present, late, absent, excused, session.expectedCount, eligible ? `${Math.round(attended / eligible * 100)}%` : "0%"];
      }),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((value) => csvCell(String(value))).join(",")).join("\r\n")}`;
    await prisma.auditLog.create({
      data: { actorId: viewer.id, action: "EXPORT_STATISTICS", entityType: "Session", entityId: "filtered", metadata: { period, promotionId, courseId, rows: sessions.length } },
    });
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="statistiques-presence-${period.toLowerCase()}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const exportRows = sessionId
    ? getSessionRoster(snapshot, sessionId)
      .filter(({ student, attendance }) =>
        (!query || `${student.name} ${student.matricule ?? ""}`.toLocaleLowerCase("fr").includes(query)) &&
        (!status || status === "ALL" || (attendance?.status ?? "PENDING") === status),
      )
      .map(({ student, attendance }) => ({
        sessionId,
        matricule: student.matricule ?? "",
        studentName: student.name,
        promotion: snapshot.sessions.find((session) => session.id === sessionId)?.promotion ?? "",
        checkedInAt: attendance?.checkedInAt ?? "",
        status: attendance?.status ?? "PENDING",
        source: attendance?.source ?? "",
        note: attendance?.note ?? "",
        correctionReason: attendance?.correctionReason ?? "",
      }))
    : snapshot.attendances
      .filter((attendance) => !status || status === "ALL" || attendance.status === status)
      .map((attendance) => ({
        sessionId: attendance.sessionId,
        matricule: attendance.matricule,
        studentName: attendance.studentName,
        promotion: attendance.promotion,
        checkedInAt: attendance.checkedInAt ?? "",
        status: attendance.status,
        source: attendance.source ?? "",
        note: attendance.note ?? "",
        correctionReason: attendance.correctionReason ?? "",
      }));
  const rows = [
    ["Session", "Matricule", "Étudiant", "Promotion", "Heure", "Statut", "Source", "Note", "Motif de correction"],
    ...exportRows.map((record) => [
      record.sessionId,
      record.matricule,
      record.studentName,
      record.promotion,
      record.checkedInAt,
      record.status,
      record.source,
      record.note,
      record.correctionReason,
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  const filename = sessionId ? `presences-${sessionId}.csv` : "presences.csv";

  await prisma.auditLog.create({
    data: { actorId: viewer.id, action: "EXPORT_ATTENDANCES", entityType: "Attendance", entityId: sessionId ?? "filtered", metadata: { status, query, rows: exportRows.length } },
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    return await buildExport(request);
  } catch (error) {
    return apiFailure(error);
  }
}
