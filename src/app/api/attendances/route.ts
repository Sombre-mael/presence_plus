import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAcademicSnapshot } from "@/lib/academic-repository";
import { getDemoViewer } from "@/lib/demo-viewer";

const querySchema = z.object({
  sessionId: z.string().trim().min(1).optional(),
  status: z.enum(["PRESENT", "LATE", "ABSENT", "EXCUSED"]).optional(),
});

export async function GET(request: NextRequest) {
  const result = querySchema.safeParse({
    sessionId: request.nextUrl.searchParams.get("sessionId") || undefined,
    status: request.nextUrl.searchParams.get("status") || undefined,
  });

  if (!result.success) {
    return Response.json(
      { error: "Paramètres de recherche invalides.", details: z.treeifyError(result.error) },
      { status: 400 },
    );
  }

  const viewer = await getDemoViewer();
  if (!viewer) return Response.json({ error: "Profil de démonstration requis." }, { status: 401 });
  const snapshot = await getAcademicSnapshot(viewer);
  if (result.data.sessionId && !snapshot.sessions.some((session) => session.id === result.data.sessionId)) {
    return Response.json({ error: "Session introuvable." }, { status: 404 });
  }

  const filtered = snapshot.attendances.filter((attendance) => {
    const matchesSession = !result.data.sessionId || attendance.sessionId === result.data.sessionId;
    const matchesStatus = !result.data.status || attendance.status === result.data.status;
    return matchesSession && matchesStatus;
  });

  return Response.json({ data: filtered, total: filtered.length });
}
