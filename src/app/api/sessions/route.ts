import type { NextRequest } from "next/server";
import { z } from "zod";
import { sessions } from "@/lib/mock-data";

const querySchema = z.object({
  status: z.enum(["SCHEDULED", "ACTIVE", "COMPLETED"]).optional(),
  teacher: z.string().trim().min(1).optional(),
});

export function GET(request: NextRequest) {
  const result = querySchema.safeParse({
    status: request.nextUrl.searchParams.get("status") || undefined,
    teacher: request.nextUrl.searchParams.get("teacher") || undefined,
  });

  if (!result.success) {
    return Response.json(
      { error: "Paramètres de recherche invalides.", details: z.treeifyError(result.error) },
      { status: 400 },
    );
  }

  const filtered = sessions.filter((session) => {
    const matchesStatus = !result.data.status || session.status === result.data.status;
    const matchesTeacher =
      !result.data.teacher ||
      session.teacher.toLocaleLowerCase("fr").includes(result.data.teacher.toLocaleLowerCase("fr"));
    return matchesStatus && matchesTeacher;
  });

  return Response.json({ data: filtered, total: filtered.length });
}
