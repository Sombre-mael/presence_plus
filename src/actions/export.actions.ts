
"use server";

import { prisma } from "@/lib/prisma";

export async function exportAttendances() {
  const attendances = await prisma.attendance.findMany({
    include: {
      student: true,
      session: true,
    },
  });
  const rows = attendances.map((attendance) => ({
    student: attendance.student.name,
    session: attendance.session.name,
    status: attendance.status,
    source: attendance.source,
    createdAt: attendance.createdAt.toISOString(),
  }));

const header = [
  "Student",
  "Session",
  "Status",
  "Source",
  "Date",
];

const escapeCsvCell = (value: string) => `"${value.replaceAll('"', '""')}"`;

const csv = [
  header.map(escapeCsvCell).join(","),
  ...rows.map((row) =>
    [row.student, row.session, row.status, row.source, row.createdAt]
      .map(escapeCsvCell)
      .join(","),
  ),
].join("\n");

return csv;
}
