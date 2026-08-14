import { getAppVersion } from "@/lib/app-version";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { version: getAppVersion() },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  );
}
