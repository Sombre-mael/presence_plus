import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedViewer } from "@/lib/authenticated-viewer";
import { getProfileAvatar } from "@/lib/profile-avatar.server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const { id } = await context.params;
  const submission = await prisma.profilePhotoSubmission.findUnique({
    where: { id },
    select: { userId: true, blobUrl: true, status: true },
  });
  if (!submission) return NextResponse.json({ error: "Photo introuvable." }, { status: 404 });
  const allowed = submission.status === "APPROVED" || viewer.role === "ADMIN" || viewer.id === submission.userId;
  if (!allowed) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const result = await getProfileAvatar(submission.blobUrl, request.headers.get("if-none-match") ?? undefined);
  if (!result) return NextResponse.json({ error: "Photo introuvable." }, { status: 404 });
  if (result.statusCode === 304) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: result.blob.etag, "Cache-Control": "private, no-store" },
    });
  }
  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "image/webp",
      "Content-Length": String(result.blob.size),
      ETag: result.blob.etag,
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
