
"use server";

import { prisma } from "@/lib/prisma";

export async function exportAttendances() {
  const attendances = await prisma.attendance.findMany({
    include: {
      user: true,
      session: true,
    },
  });
  const rows = attendances.map((attendance) => ({
  student: attendance.user.name,
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

const csv = [
  header.join(","),
  ...rows.map((row) =>
    [
      row.student,
      row.session,
      row.status,
      row.source,
      row.createdAt,
    ].join(",")
  ),
].join("\n");

return csv;
}
