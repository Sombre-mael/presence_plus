import type { NextRequest } from "next/server";
import { getAcademicSnapshot } from "@/lib/academic-repository";
import { getDemoViewer } from "@/lib/demo-viewer";
import { prisma } from "@/lib/prisma";

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  const kind = request.nextUrl.searchParams.get("kind") ?? "attendances";
  const status = request.nextUrl.searchParams.get("status");

  const viewer = await getDemoViewer();
  if (!viewer) return Response.json({ error: "Profil de démonstration requis." }, { status: 401 });
  const snapshot = await getAcademicSnapshot(viewer);
  if (sessionId && !snapshot.sessions.some((session) => session.id === sessionId)) {
    return Response.json({ error: "Session introuvable." }, { status: 404 });
  }

  if (kind === "statistics") {
    if (viewer.role !== "ADMIN") return Response.json({ error: "Acces administrateur requis." }, { status: 403 });
    const period = request.nextUrl.searchParams.get("period") ?? "30D";
    const promotionId = request.nextUrl.searchParams.get("promotionId");
    const courseId = request.nextUrl.searchParams.get("courseId");
    const days = period === "7D" ? 7 : period === "180D" ? 180 : 30;
    const minimum = new Date();
    minimum.setUTCDate(minimum.getUTCDate() - days + 1);
    const minimumDate = minimum.toLocaleDateString("en-CA", { timeZone: "Africa/Lubumbashi" });
    const sessions = snapshot.sessions.filter((session) => {
      const course = snapshot.courses.find((item) => item.id === session.courseId);
      return session.date >= minimumDate && (!promotionId || course?.promotionId === promotionId) && (!courseId || session.courseId === courseId);
    });
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

  const records = sessionId
    ? snapshot.attendances.filter((attendance) => attendance.sessionId === sessionId)
    : snapshot.attendances;
  const filteredRecords = status && status !== "ALL"
    ? records.filter((attendance) => attendance.status === status)
    : records;
  const rows = [
    ["Session", "Matricule", "Étudiant", "Promotion", "Heure", "Statut"],
    ...filteredRecords.map((record) => [
      record.sessionId,
      record.matricule,
      record.studentName,
      record.promotion,
      record.checkedInAt ?? "",
      record.status,
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  const filename = sessionId ? `presences-${sessionId}.csv` : "presences.csv";

  await prisma.auditLog.create({
    data: { actorId: viewer.id, action: "EXPORT_ATTENDANCES", entityType: "Attendance", entityId: sessionId ?? "filtered", metadata: { status, rows: filteredRecords.length } },
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
