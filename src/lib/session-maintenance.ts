import "server-only";

import { prisma } from "@/lib/prisma";
import { SERIALIZABLE_TRANSACTION_OPTIONS } from "@/lib/transaction-options";

export const AUTO_CANCELLATION_REASON =
  "Annulation automatique : séance non démarrée avant l’heure de fin.";

export async function reconcileExpiredScheduledSessions(now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const expired = await tx.session.findMany({
      where: { status: "SCHEDULED", scheduledEndAt: { lt: now } },
      orderBy: { scheduledEndAt: "asc" },
      select: {
        id: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
        teacherId: true,
        courseId: true,
        promotionId: true,
      },
    });

    const cancelledIds: string[] = [];
    for (const session of expired) {
      const cancelled = await tx.session.updateMany({
        where: {
          id: session.id,
          status: "SCHEDULED",
          scheduledEndAt: { lt: now },
        },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          cancellationReason: AUTO_CANCELLATION_REASON,
        },
      });
      if (cancelled.count === 0) continue;

      await tx.auditLog.create({
        data: {
          actorId: null,
          action: "AUTO_CANCEL_SESSION",
          entityType: "Session",
          entityId: session.id,
          metadata: {
            automated: true,
            reason: AUTO_CANCELLATION_REASON,
            scheduledStartAt: session.scheduledStartAt.toISOString(),
            scheduledEndAt: session.scheduledEndAt.toISOString(),
            teacherId: session.teacherId,
            courseId: session.courseId,
            promotionId: session.promotionId,
          },
        },
      });
      cancelledIds.push(session.id);
    }

    return cancelledIds;
  }, SERIALIZABLE_TRANSACTION_OPTIONS);
}
