import { beforeEach, describe, expect, it, vi } from "vitest";
import { attendanceStatusForSession, validateCorrectionResolution } from "../src/lib/academic-domain";

const mocks = vi.hoisted(() => ({ viewer: vi.fn(), transaction: vi.fn(), request: vi.fn(), upsert: vi.fn(), update: vi.fn(), audit: vi.fn(), patch: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/lib/authenticated-viewer", () => ({ getAuthenticatedViewer: mocks.viewer }));
vi.mock("@/lib/academic-repository", () => ({ getAcademicPatch: mocks.patch, fromAcademicDateTime: (date: string, time: string) => new Date(`${date}T${time}:00+02:00`), toAcademicDate: () => "2026-09-10" }));
vi.mock("@/lib/auth-token.server", () => ({}));
vi.mock("@/lib/auth-email.server", () => ({}));
vi.mock("@/lib/auth-crypto.server", () => ({}));
vi.mock("@/lib/auth-session.server", () => ({}));
vi.mock("@/lib/qr-token.server", () => ({}));
vi.mock("@/lib/profile-photo.server", () => ({}));
vi.mock("@/lib/admin-access.server", () => ({}));
vi.mock("@/lib/notifications.server", () => ({ createUserNotifications: vi.fn().mockResolvedValue([]), deliverNotificationPush: vi.fn().mockResolvedValue(undefined) }));
import { resolveCorrectionRequestAction } from "../src/actions/academic.actions";

const input = { requestId: "r1", teacherId: "ignored", decision: "APPROVE" as const, reason: "Retard excusé après vérification", resolvedStatus: "PRESENT" as const, checkedInAt: "08:45" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.viewer.mockResolvedValue({ id: "t1", role: "TEACHER", mustChangePassword: false });
  mocks.request.mockResolvedValue({ id: "r1", studentId: "s1", sessionId: "session1", attendanceId: null, reason: "Erreur de pointage", session: { status: "COMPLETED", scheduledStartAt: new Date("2026-09-10T06:00:00Z"), lateThresholdMinutes: 10 } });
  mocks.upsert.mockImplementation(async ({ update }) => ({ id: "a1", ...update }));
  mocks.patch.mockResolvedValue({ attendances: [], sessions: [], correctionRequests: [] });
  mocks.transaction.mockImplementation(async (operation) => operation({ $queryRaw: vi.fn(), attendanceCorrectionRequest: { findFirst: mocks.request, update: mocks.update }, attendance: { upsert: mocks.upsert }, auditLog: { create: mocks.audit } }));
});

describe("décisions de correction", () => {
  it.each(["PRESENT", "LATE", "EXCUSED", "ABSENT"] as const)("enregistre le statut exact %s et renvoie les collections actualisées", async (status) => {
    const result = await resolveCorrectionRequestAction({ ...input, resolvedStatus: status });
    expect(result.ok).toBe(true);
    expect(mocks.upsert.mock.calls[0][0].update.status).toBe(status);
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({ status: "APPROVED", resolvedStatus: status, resolvedById: "t1", attendanceId: "a1" });
    expect(mocks.patch).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }), ["correctionRequests", "attendances", "sessions"]);
    expect(mocks.audit).toHaveBeenCalledOnce();
    expect(mocks.request.mock.calls[0][0].where).toMatchObject({ teacherId: "t1", status: "PENDING" });
  });

  it("ne modifie jamais une présence lors d’un refus", async () => {
    expect((await resolveCorrectionRequestAction({ ...input, decision: "REJECT" })).ok).toBe(true);
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({ status: "REJECTED", resolvedStatus: null });
  });

  it("refuse une demande déjà traitée, étrangère ou une séance non clôturée", async () => {
    mocks.request.mockResolvedValueOnce(null);
    expect((await resolveCorrectionRequestAction(input)).ok).toBe(false);
    mocks.request.mockResolvedValueOnce({ session: { status: "ACTIVE" } });
    expect((await resolveCorrectionRequestAction(input)).ok).toBe(false);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("refuse un non-enseignant et les données invalides avant la transaction", async () => {
    mocks.viewer.mockResolvedValueOnce({ role: "STUDENT" });
    expect((await resolveCorrectionRequestAction(input)).ok).toBe(false);
    expect((await resolveCorrectionRequestAction({ ...input, checkedInAt: "29:65" })).ok).toBe(false);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(validateCorrectionResolution({ ...input, reason: "" }).ok).toBe(false);
    expect(validateCorrectionResolution({ ...input, resolvedStatus: undefined }).ok).toBe(false);
  });

  it("calcule les retards uniquement pendant la séance active", () => {
    const session = { startTime: "08:00", lateThresholdMinutes: 10 };
    expect(attendanceStatusForSession({ ...session, status: "ACTIVE" }, "PRESENT", "08:45")).toBe("LATE");
    expect(attendanceStatusForSession({ ...session, status: "COMPLETED" }, "PRESENT", "08:45")).toBe("PRESENT");
    expect(attendanceStatusForSession({ ...session, status: "COMPLETED" }, "LATE", "08:00")).toBe("LATE");
  });
});
