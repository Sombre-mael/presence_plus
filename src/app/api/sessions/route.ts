import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAcademicSnapshot } from "@/lib/academic-repository";
import { getDemoViewer } from "@/lib/demo-viewer";

const querySchema = z.object({
  status: z.enum(["SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  teacher: z.string().trim().min(1).optional(),
});

export async function GET(request: NextRequest) {
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

  const viewer = await getDemoViewer();
  if (!viewer) return Response.json({ error: "Profil de démonstration requis." }, { status: 401 });
  const { sessions } = await getAcademicSnapshot(viewer);
  const filtered = sessions.filter((session) => {
    const matchesStatus = !result.data.status || session.status === result.data.status;
    const matchesTeacher =
      !result.data.teacher ||
      session.teacher.toLocaleLowerCase("fr").includes(result.data.teacher.toLocaleLowerCase("fr"));
    return matchesStatus && matchesTeacher;
  });

  return Response.json({ data: filtered, total: filtered.length });
}
