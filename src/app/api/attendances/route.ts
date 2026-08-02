import type { NextRequest } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { apiFailure, PRIVATE_RESPONSE_HEADERS } from "@/lib/api-response";
import {
  countAttendancesForViewer,
  countSessionsForViewer,
  getAttendancesForViewer,
} from "@/lib/academic-repository";
import { getDemoViewer } from "@/lib/demo-viewer";

const querySchema = z.object({
  sessionId: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["PRESENT", "LATE", "ABSENT", "EXCUSED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(request: NextRequest) {
  const result = querySchema.safeParse({
    sessionId: request.nextUrl.searchParams.get("sessionId") || undefined,
    status: request.nextUrl.searchParams.get("status") || undefined,
    page: request.nextUrl.searchParams.get("page") || undefined,
    pageSize: request.nextUrl.searchParams.get("pageSize") || undefined,
  });
  if (!result.success) {
    return Response.json(
      { error: "Parametres de recherche invalides.", details: z.treeifyError(result.error) },
      { status: 400, headers: PRIVATE_RESPONSE_HEADERS },
    );
  }

  try {
    const viewer = await getDemoViewer();
    if (!viewer) return Response.json({ error: "Profil de demonstration requis." }, { status: 401, headers: PRIVATE_RESPONSE_HEADERS });
    if (result.data.sessionId && await countSessionsForViewer(viewer, { id: result.data.sessionId }) === 0) {
      return Response.json({ error: "Session introuvable." }, { status: 404, headers: PRIVATE_RESPONSE_HEADERS });
    }
    const where: Prisma.AttendanceWhereInput = {
      ...(result.data.sessionId ? { sessionId: result.data.sessionId } : {}),
      ...(result.data.status ? { status: result.data.status } : {}),
    };
    const skip = (result.data.page - 1) * result.data.pageSize;
    const [data, total] = await Promise.all([
      getAttendancesForViewer(viewer, { where, skip, take: result.data.pageSize }),
      countAttendancesForViewer(viewer, where),
    ]);
    return Response.json(
      { data, total, page: result.data.page, pageSize: result.data.pageSize },
      { headers: PRIVATE_RESPONSE_HEADERS },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
