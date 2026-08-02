import type { NextRequest } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { apiFailure, PRIVATE_RESPONSE_HEADERS } from "@/lib/api-response";
import { countSessionsForViewer, getSessionsForViewer } from "@/lib/academic-repository";
import { getDemoViewer } from "@/lib/demo-viewer";

const querySchema = z.object({
  status: z.enum(["SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  teacher: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(request: NextRequest) {
  const result = querySchema.safeParse({
    status: request.nextUrl.searchParams.get("status") || undefined,
    teacher: request.nextUrl.searchParams.get("teacher") || undefined,
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
    const where: Prisma.SessionWhereInput = {
      ...(result.data.status ? { status: result.data.status } : {}),
      ...(result.data.teacher ? { teacher: { name: { contains: result.data.teacher, mode: "insensitive" } } } : {}),
    };
    const skip = (result.data.page - 1) * result.data.pageSize;
    const [data, total] = await Promise.all([
      getSessionsForViewer(viewer, { where, skip, take: result.data.pageSize }),
      countSessionsForViewer(viewer, where),
    ]);
    return Response.json(
      { data, total, page: result.data.page, pageSize: result.data.pageSize },
      { headers: PRIVATE_RESPONSE_HEADERS },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
