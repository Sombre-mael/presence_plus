"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedViewer, getViewerForRole } from "@/lib/authenticated-viewer";
import { currentClientIp } from "@/lib/auth-request.server";
import { hashSensitiveKey } from "@/lib/auth-crypto.server";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal-policy";
import { getLegalAcceptanceState, getLegalConfiguration } from "@/lib/legal.server";
import { withSerializableRetry } from "@/lib/database-retry";
import { SERIALIZABLE_TRANSACTION_OPTIONS } from "@/lib/transaction-options";
import type { AuthActionResult } from "@/types/auth";
import type {
  AdminPrivacyRequestSummary,
  DataSubjectRequestSummary,
  PrivacyDashboardData,
} from "@/types/privacy";
import { canAdminProcessPrivacyRequest, isActivePrivacyRequest } from "@/lib/privacy-domain";

const requestSchema = z.object({
  type: z.enum(["ACCESS", "RECTIFICATION", "EXPORT", "OBJECTION", "DELETION"]),
  details: z.string().trim().max(2_000),
}).superRefine((value, context) => {
  if (["RECTIFICATION", "OBJECTION", "DELETION"].includes(value.type) && value.details.length < 10) {
    context.addIssue({ code: "custom", path: ["details"], message: "Expliquez votre demande en au moins 10 caractères." });
  }
});

const decisionSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(["IN_REVIEW", "COMPLETED", "REJECTED"]),
  responseMessage: z.string().trim().max(2_000),
}).superRefine((value, context) => {
  if (["COMPLETED", "REJECTED"].includes(value.status) && value.responseMessage.length < 10) {
    context.addIssue({ code: "custom", path: ["responseMessage"], message: "Expliquez la décision en au moins 10 caractères." });
  }
});

function mapRequest(request: {
  id: string;
  type: DataSubjectRequestSummary["type"];
  status: DataSubjectRequestSummary["status"];
  details: string | null;
  responseMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  handledBy?: { name: string } | null;
}): DataSubjectRequestSummary {
  return {
    id: request.id,
    type: request.type,
    status: request.status,
    details: request.details ?? undefined,
    responseMessage: request.responseMessage ?? undefined,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    resolvedAt: request.resolvedAt?.toISOString(),
    handledByName: request.handledBy?.name,
  };
}

export async function acceptCurrentLegalDocumentsAction(
  termsAccepted: boolean,
  privacyAcknowledged: boolean,
): Promise<AuthActionResult> {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) return { ok: false, message: "Votre session a expiré. Reconnectez-vous." };
  const fieldErrors: Record<string, string> = {};
  if (!termsAccepted) fieldErrors.termsAccepted = "Vous devez accepter les conditions d’utilisation.";
  if (!privacyAcknowledged) fieldErrors.privacyAcknowledged = "Vous devez confirmer avoir lu la politique de confidentialité.";
  if (Object.keys(fieldErrors).length) {
    return { ok: false, message: "Les deux confirmations sont nécessaires pour continuer.", fieldErrors };
  }

  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 500) ?? null;
  const ipHash = hashSensitiveKey(`legal-acceptance-ip:${await currentClientIp()}`);
  const now = new Date();
  await withSerializableRetry(() => prisma.$transaction(async (tx) => {
    await Promise.all([
      tx.legalAcceptance.upsert({
        where: { userId_documentType_version: { userId: viewer.id, documentType: "TERMS", version: TERMS_VERSION } },
        create: { userId: viewer.id, documentType: "TERMS", version: TERMS_VERSION, acceptedAt: now, ipHash, userAgent },
        update: {},
      }),
      tx.legalAcceptance.upsert({
        where: { userId_documentType_version: { userId: viewer.id, documentType: "PRIVACY_NOTICE", version: PRIVACY_VERSION } },
        create: { userId: viewer.id, documentType: "PRIVACY_NOTICE", version: PRIVACY_VERSION, acceptedAt: now, ipHash, userAgent },
        update: {},
      }),
    ]);
    await tx.auditLog.create({
      data: {
        actorId: viewer.id,
        action: "ACCEPT_LEGAL_DOCUMENTS",
        entityType: "LegalAcceptance",
        entityId: viewer.id,
        metadata: { termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION },
      },
    });
  }, SERIALIZABLE_TRANSACTION_OPTIONS));
  revalidatePath("/", "layout");
  return { ok: true, message: "Vos choix ont été enregistrés." };
}

export async function getPrivacyDashboardData(): Promise<PrivacyDashboardData | null> {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) return null;
  const [configuration, acceptance, requests, userCounts, attendanceCount, sessionCount, correctionCount] = await Promise.all([
    getLegalConfiguration(),
    getLegalAcceptanceState(viewer.id),
    prisma.dataSubjectRequest.findMany({
      where: { userId: viewer.id },
      orderBy: { createdAt: "desc" },
      include: { handledBy: { select: { name: true } } },
    }),
    prisma.user.findUnique({
      where: { id: viewer.id },
      select: {
        _count: {
          select: {
            notifications: true,
            authSessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } } },
            profilePhotoSubmissions: true,
            legalAcceptances: true,
          },
        },
      },
    }),
    viewer.role === "STUDENT"
      ? prisma.attendance.count({ where: { studentId: viewer.id } })
      : prisma.attendance.count({ where: { correctedById: viewer.id } }),
    viewer.role === "TEACHER"
      ? prisma.session.count({ where: { teacherId: viewer.id } })
      : viewer.role === "STUDENT"
        ? prisma.sessionEnrollment.count({ where: { studentId: viewer.id } })
        : Promise.resolve(0),
    viewer.role === "STUDENT"
      ? prisma.attendanceCorrectionRequest.count({ where: { studentId: viewer.id } })
      : viewer.role === "TEACHER"
        ? prisma.attendanceCorrectionRequest.count({ where: { teacherId: viewer.id } })
        : Promise.resolve(0),
  ]);
  return {
    configuration,
    requests: requests.map(mapRequest),
    inventory: {
      attendanceCount,
      sessionCount,
      correctionCount,
      notificationCount: userCounts?._count.notifications ?? 0,
      activeSessionCount: userCounts?._count.authSessions ?? 0,
      photoSubmissionCount: userCounts?._count.profilePhotoSubmissions ?? 0,
      acceptanceCount: userCounts?._count.legalAcceptances ?? 0,
    },
    termsAcceptedAt: acceptance.termsAcceptedAt?.toISOString(),
    privacyAcknowledgedAt: acceptance.privacyAcknowledgedAt?.toISOString(),
  };
}

export async function createDataSubjectRequestAction(
  type: string,
  details: string,
): Promise<AuthActionResult<DataSubjectRequestSummary>> {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) return { ok: false, message: "Votre session a expiré. Reconnectez-vous." };
  const parsed = requestSchema.safeParse({ type, details });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Vérifiez les informations de la demande.",
      fieldErrors: Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])),
    };
  }
  const active = await prisma.dataSubjectRequest.findFirst({
    where: { userId: viewer.id, type: parsed.data.type, status: { in: ["PENDING", "IN_REVIEW"] } },
    select: { id: true },
  });
  if (active) return { ok: false, message: "Une demande de ce type est déjà en cours de traitement." };

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.dataSubjectRequest.create({
      data: { userId: viewer.id, type: parsed.data.type, details: parsed.data.details || null },
      include: { handledBy: { select: { name: true } } },
    });
    await tx.auditLog.create({
      data: { actorId: viewer.id, action: "CREATE_DATA_SUBJECT_REQUEST", entityType: "DataSubjectRequest", entityId: created.id, metadata: { type: created.type } },
    });
    return created;
  });
  revalidatePath("/account/privacy");
  revalidatePath("/admin/privacy-requests");
  return { ok: true, message: "Votre demande a été transmise à l’établissement.", value: mapRequest(request) };
}

export async function cancelDataSubjectRequestAction(requestId: string): Promise<AuthActionResult> {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) return { ok: false, message: "Votre session a expiré. Reconnectez-vous." };
  const result = await prisma.dataSubjectRequest.updateMany({
    where: { id: requestId, userId: viewer.id, status: "PENDING" },
    data: { status: "CANCELLED", resolvedAt: new Date() },
  });
  if (!result.count) return { ok: false, message: "Seule une demande encore en attente peut être annulée." };
  await prisma.auditLog.create({
    data: { actorId: viewer.id, action: "CANCEL_DATA_SUBJECT_REQUEST", entityType: "DataSubjectRequest", entityId: requestId },
  });
  revalidatePath("/account/privacy");
  revalidatePath("/admin/privacy-requests");
  return { ok: true, message: "La demande a été annulée." };
}

export async function getAdminPrivacyRequestsAction(): Promise<AdminPrivacyRequestSummary[]> {
  const viewer = await getViewerForRole("ADMIN");
  if (!viewer) return [];
  const requests = await prisma.dataSubjectRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      handledBy: { select: { name: true } },
    },
  });
  return requests.map((request) => ({
    ...mapRequest(request),
    userId: request.user.id,
    userName: request.user.name,
    userEmail: request.user.email,
    userRole: request.user.role,
  }));
}

export async function resolveDataSubjectRequestAction(input: {
  requestId: string;
  status: "IN_REVIEW" | "COMPLETED" | "REJECTED";
  responseMessage: string;
}): Promise<AuthActionResult<DataSubjectRequestSummary>> {
  const viewer = await getViewerForRole("ADMIN");
  if (!viewer) return { ok: false, message: "Accès administrateur requis." };
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Vérifiez la réponse apportée.",
      fieldErrors: Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])),
    };
  }
  const existing = await prisma.dataSubjectRequest.findUnique({ where: { id: parsed.data.requestId } });
  if (!existing || !isActivePrivacyRequest(existing.status)) {
    return { ok: false, message: "Cette demande n’est plus disponible pour traitement." };
  }
  if (!canAdminProcessPrivacyRequest(existing.type, viewer.adminLevel)) {
    return { ok: false, message: "Cette décision est réservée au super administrateur." };
  }

  const now = new Date();
  const request = await prisma.$transaction(async (tx) => {
    const updated = await tx.dataSubjectRequest.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status,
        responseMessage: parsed.data.responseMessage || null,
        handledById: viewer.id,
        resolvedAt: parsed.data.status === "IN_REVIEW" ? null : now,
      },
      include: { handledBy: { select: { name: true } } },
    });
    await tx.auditLog.create({
      data: {
        actorId: viewer.id,
        action: "PROCESS_DATA_SUBJECT_REQUEST",
        entityType: "DataSubjectRequest",
        entityId: existing.id,
        metadata: { type: existing.type, status: parsed.data.status },
      },
    });
    await tx.notification.create({
      data: {
        userId: existing.userId,
        kind: "SYSTEM",
        title: "Mise à jour de votre demande",
        body: parsed.data.status === "IN_REVIEW" ? "Votre demande est en cours d’examen." : "Une décision est disponible dans votre espace confidentialité.",
        href: "/account/privacy",
        dedupeKey: `privacy-request:${existing.id}:${parsed.data.status}`,
      },
    });
    return updated;
  });
  revalidatePath("/account/privacy");
  revalidatePath("/admin/privacy-requests");
  return { ok: true, message: "Le suivi de la demande a été enregistré.", value: mapRequest(request) };
}
