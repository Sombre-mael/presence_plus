import { applyPrivacyRetention } from "@/lib/privacy-retention.server";
import { PRIVATE_RESPONSE_HEADERS } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Accès refusé." }, { status: 401, headers: PRIVATE_RESPONSE_HEADERS });
  }
  try {
    const summary = await applyPrivacyRetention();
    return Response.json({ ok: true, summary }, { headers: PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    console.error("Privacy retention failed", error instanceof Error ? error.message : "unknown");
    return Response.json({ error: "Le traitement de conservation a échoué." }, { status: 500, headers: PRIVATE_RESPONSE_HEADERS });
  }
}
