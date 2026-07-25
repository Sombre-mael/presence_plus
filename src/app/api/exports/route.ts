import type { NextRequest } from "next/server";
import { attendances, getSession } from "@/lib/mock-data";

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (sessionId && !getSession(sessionId)) {
    return Response.json({ error: "Session introuvable." }, { status: 404 });
  }

  const records = sessionId
    ? attendances.filter((attendance) => attendance.sessionId === sessionId)
    : attendances;
  const rows = [
    ["Session", "Matricule", "Étudiant", "Promotion", "Heure", "Statut"],
    ...records.map((record) => [
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

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
