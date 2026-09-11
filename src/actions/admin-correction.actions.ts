"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getViewerForRole } from "@/lib/authenticated-viewer";
import { isSuperAdmin, verifyViewerPassword } from "@/lib/admin-access.server";
import { createUserNotifications, deliverNotificationPush } from "@/lib/notifications.server";
import { fromAcademicDateTime, toAcademicDate } from "@/lib/academic-repository";
import { SERIALIZABLE_TRANSACTION_OPTIONS } from "@/lib/transaction-options";
import type { AuthActionResult } from "@/types/auth";

const overrideSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  resolvedStatus: z.enum(["PRESENT", "LATE", "ABSENT", "EXCUSED"]).optional(),
  checkedInAt: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  reason: z.string().trim().min(5, "Le motif doit contenir au moins 5 caractères.").max(500),
  currentPassword: z.string().min(1, "Votre mot de passe est requis."),
}).superRefine((value, context) => {
  if (value.decision === "APPROVE" && !value.resolvedStatus) context.addIssue({ code: "custom", path: ["resolvedStatus"], message: "Sélectionnez le statut final." });
  if (value.decision === "APPROVE" && ["PRESENT", "LATE"].includes(value.resolvedStatus ?? "") && !value.checkedInAt) context.addIssue({ code: "custom", path: ["checkedInAt"], message: "Indiquez l’heure de présence." });
});

export async function overrideCorrectionRequestAction(input: z.input<typeof overrideSchema>): Promise<AuthActionResult> {
  const viewer = await getViewerForRole("ADMIN");
  if (!isSuperAdmin(viewer)) return { ok: false, message: "Cette décision exceptionnelle est réservée au super administrateur." };
  const parsed = overrideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Vérifiez les informations saisies.", fieldErrors: Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])) };
  if (!await verifyViewerPassword(viewer.id, parsed.data.currentPassword)) return { ok: false, message: "Le mot de passe actuel est incorrect.", fieldErrors: { currentPassword: "Vérifiez votre mot de passe." } };
  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "AttendanceCorrectionRequest" WHERE id = ${parsed.data.requestId} FOR UPDATE`;
    const request = await tx.attendanceCorrectionRequest.findFirst({ where: { id: parsed.data.requestId, status: "PENDING" }, include: { session: true } });
    if (!request || request.session.status !== "COMPLETED") return null;
    const approved = parsed.data.decision === "APPROVE";
    let attendanceId = request.attendanceId;
    if (approved && parsed.data.resolvedStatus) {
      const checkedInAt = ["PRESENT", "LATE"].includes(parsed.data.resolvedStatus) && parsed.data.checkedInAt
        ? fromAcademicDateTime(toAcademicDate(request.session.scheduledStartAt), parsed.data.checkedInAt)
        : null;
      const attendance = await tx.attendance.upsert({
        where: { studentId_sessionId: { studentId: request.studentId, sessionId: request.sessionId } },
        create: { studentId: request.studentId, sessionId: request.sessionId, status: parsed.data.resolvedStatus, source: "MANUAL", checkedInAt, note: parsed.data.resolvedStatus === "EXCUSED" ? request.reason : null, correctionReason: parsed.data.reason, correctedAt: new Date(), correctedById: viewer.id },
        update: { status: parsed.data.resolvedStatus, checkedInAt, note: parsed.data.resolvedStatus === "EXCUSED" ? request.reason : null, correctionReason: parsed.data.reason, correctedAt: new Date(), correctedById: viewer.id },
      });
      attendanceId = attendance.id;
    }
    await tx.attendanceCorrectionRequest.update({ where: { id: request.id }, data: { attendanceId, status: approved ? "APPROVED" : "REJECTED", decisionReason: parsed.data.reason, resolvedStatus: approved ? parsed.data.resolvedStatus : null, resolvedById: viewer.id, resolvedAt: new Date() } });
    await tx.auditLog.create({ data: { actorId: viewer.id, action: approved ? "ADMIN_APPROVE_CORRECTION_REQUEST" : "ADMIN_REJECT_CORRECTION_REQUEST", entityType: "AttendanceCorrectionRequest", entityId: request.id, metadata: { reason: parsed.data.reason, resolvedStatus: approved ? parsed.data.resolvedStatus : null, teacherId: request.teacherId } } });
    const [studentNotificationIds, teacherNotificationIds] = await Promise.all([
      createUserNotifications(tx, [request.studentId], { kind: "CORRECTION_RESOLVED", title: "Demande de correction traitée", body: "Une décision administrative a été enregistrée avec traçabilité.", href: "/student/history", dedupeKey: `admin-correction-resolved:${request.id}:student` }),
      createUserNotifications(tx, [request.teacherId], { kind: "CORRECTION_RESOLVED", title: "Demande traitée par l’administration", body: "Une décision exceptionnelle a été appliquée à une demande de votre cours.", href: `/teacher/sessions/${request.sessionId}/attendances`, dedupeKey: `admin-correction-resolved:${request.id}:teacher` }),
    ]);
    return { notificationIds: [...studentNotificationIds, ...teacherNotificationIds] };
  }, SERIALIZABLE_TRANSACTION_OPTIONS);
  if (!outcome) return { ok: false, message: "Cette demande n’est plus disponible ou la séance n’est pas clôturée." };
  await deliverNotificationPush(outcome.notificationIds).catch(() => undefined);
  revalidatePath("/admin/corrections");
  revalidatePath("/admin/assiduity");
  revalidatePath("/teacher", "layout");
  revalidatePath("/student", "layout");
  return { ok: true, message: parsed.data.decision === "APPROVE" ? "La correction a été appliquée et auditée." : "La demande a été refusée et auditée." };
}
