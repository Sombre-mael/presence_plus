import { getAuthenticatedViewer } from "@/lib/authenticated-viewer";
import { prisma } from "@/lib/prisma";
import { PRIVATE_RESPONSE_HEADERS } from "@/lib/api-response";

export async function GET(request: Request) {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) return Response.json({ error: "Authentification requise." }, { status: 401, headers: PRIVATE_RESPONSE_HEADERS });
  const requestId = new URL(request.url).searchParams.get("requestId") ?? "";
  const approved = await prisma.dataSubjectRequest.findFirst({
    where: { id: requestId, userId: viewer.id, type: "EXPORT", status: "COMPLETED" },
    select: { id: true },
  });
  if (!approved) return Response.json({ error: "Cet export n’est pas disponible." }, { status: 403, headers: PRIVATE_RESPONSE_HEADERS });

  const [account, attendances, sessions, corrections, notifications, acceptances, requests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: viewer.id },
      select: { id: true, matricule: true, name: true, preferredName: true, email: true, phone: true, avatarColor: true, role: true, status: true, activatedAt: true, passwordChangedAt: true, lastLoginAt: true, createdAt: true, updatedAt: true, promotion: { select: { name: true, department: true, academicYear: true } } },
    }),
    prisma.attendance.findMany({ where: { studentId: viewer.id }, select: { status: true, source: true, checkedInAt: true, note: true, correctionReason: true, correctedAt: true, createdAt: true, session: { select: { name: true, scheduledStartAt: true, courses: { select: { code: true, name: true } } } } } }),
    prisma.session.findMany({ where: { teacherId: viewer.id }, select: { name: true, description: true, status: true, scheduledStartAt: true, scheduledEndAt: true, room: true, courses: { select: { code: true, name: true } }, promotion: { select: { name: true } } } }),
    prisma.attendanceCorrectionRequest.findMany({ where: { OR: [{ studentId: viewer.id }, { teacherId: viewer.id }, { resolvedById: viewer.id }] }, select: { requestedStatus: true, reason: true, status: true, decisionReason: true, resolvedStatus: true, resolvedAt: true, createdAt: true, session: { select: { name: true } } } }),
    prisma.notification.findMany({ where: { userId: viewer.id }, select: { kind: true, title: true, body: true, readAt: true, createdAt: true } }),
    prisma.legalAcceptance.findMany({ where: { userId: viewer.id }, select: { documentType: true, version: true, acceptedAt: true } }),
    prisma.dataSubjectRequest.findMany({ where: { userId: viewer.id }, select: { type: true, status: true, details: true, responseMessage: true, createdAt: true, resolvedAt: true } }),
  ]);
  await prisma.auditLog.create({ data: { actorId: viewer.id, action: "EXPORT_PERSONAL_DATA", entityType: "DataSubjectRequest", entityId: approved.id } });
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), account, attendances, taughtSessions: sessions, correctionRequests: corrections, notifications, legalAcceptances: acceptances, privacyRequests: requests }, null, 2);
  return new Response(body, {
    headers: {
      ...PRIVATE_RESPONSE_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="presence-plus-mes-donnees-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
