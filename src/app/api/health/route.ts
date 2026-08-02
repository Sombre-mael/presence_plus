import { prisma } from "@/lib/prisma";
import { PRIVATE_RESPONSE_HEADERS } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const checkedAt = new Date().toISOString();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json(
      { status: "ok", checkedAt, services: { database: "available" } },
      { headers: PRIVATE_RESPONSE_HEADERS },
    );
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json(
      { status: "degraded", checkedAt, services: { database: "unavailable" } },
      { status: 503, headers: PRIVATE_RESPONSE_HEADERS },
    );
  }
}
