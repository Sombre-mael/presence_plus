import { describe, expect, it } from "vitest";
import { freshAdminData } from "../src/lib/admin-seed";
import { createQrToken } from "../src/lib/academic-domain";
import {
  getStudentStats,
  validateCheckInConfirmation,
  validateCorrectionRequest,
  validateStudentCheckIn,
} from "../src/lib/student-domain";

describe("règles métier étudiant", () => {
  it("accepte les fenêtres QR courante et précédente", () => {
    const state = freshAdminData();
    const now = 90_000;
    const current = createQrToken("session-001", now).value;
    const previous = createQrToken("session-001", now - 30_000).value;

    expect(validateStudentCheckIn(state, current, "u4", "STUDENT_CODE", now).ok).toBe(true);
    expect(validateStudentCheckIn(state, previous, "u4", "STUDENT_CODE", now).ok).toBe(true);
  });

  it("refuse un QR expiré, fermé ou destiné à une autre promotion", () => {
    const state = freshAdminData();
    const now = 120_000;
    const expiredPayload = JSON.stringify({
      sessionId: "session-001",
      token: createQrToken("session-001", 30_000).value,
      expiresAt: 60_000,
    });
    const closedPayload = JSON.stringify({
      sessionId: "session-004",
      token: createQrToken("session-004", now).value,
      expiresAt: 150_000,
    });
    const otherPromotion = JSON.stringify({
      sessionId: "session-001",
      token: createQrToken("session-001", now).value,
      expiresAt: 150_000,
    });

    expect(validateStudentCheckIn(state, expiredPayload, "u4", "QR", now)).toMatchObject({ ok: false, code: "EXPIRED" });
    expect(validateStudentCheckIn(state, closedPayload, "u4", "QR", now)).toMatchObject({ ok: false, code: "SESSION_CLOSED" });
    expect(validateStudentCheckIn(state, otherPromotion, "u10", "QR", now)).toMatchObject({ ok: false, code: "WRONG_PROMOTION" });
  });

  it("détecte un doublon sans créer une erreur destructive", () => {
    const state = freshAdminData();
    state.attendances.push({
      id: "duplicate",
      sessionId: "session-001",
      studentId: "u4",
      studentName: "Sarah Mbuyi",
      matricule: "INF22-041",
      promotion: "L2 Informatique",
      checkedInAt: "08:05",
      status: "PRESENT",
      source: "QR",
    });
    const result = validateStudentCheckIn(
      state,
      createQrToken("session-001", 90_000).value,
      "u4",
      "STUDENT_CODE",
      90_000,
    );

    expect(result).toMatchObject({ ok: true, alreadyRecorded: true });
  });

  it("expire l’aperçu après soixante secondes", () => {
    const state = freshAdminData();
    const result = validateCheckInConfirmation(state, {
      sessionId: "session-001",
      studentId: "u4",
      token: "PP-TEST",
      source: "QR",
      validatedAt: 1_000,
      confirmationExpiresAt: 61_000,
      confirmedAt: 61_001,
    });
    expect(result).toMatchObject({ ok: false, code: "PREVIEW_EXPIRED" });
  });

  it("exclut les absences justifiées et sépare la ponctualité", () => {
    const state = freshAdminData();
    const record = state.attendances.find((item) => item.sessionId === "session-004" && item.studentId === "u4")!;
    record.status = "EXCUSED";
    const stats = getStudentStats(state, "u4");

    expect(stats.excusedCount).toBeGreaterThan(0);
    expect(stats.attendanceRate).toBeGreaterThanOrEqual(0);
    expect(stats.punctualityRate).toBeGreaterThanOrEqual(0);
  });

  it("valide les demandes et empêche deux demandes simultanées", () => {
    const state = freshAdminData();
    const input = {
      sessionId: "session-004",
      studentId: "u4",
      requestedStatus: "PRESENT" as const,
      reason: "J’étais bien présent pendant toute la séance.",
    };
    expect(validateCorrectionRequest(state, input).ok).toBe(true);
    state.correctionRequests.push({
      id: "request-test",
      attendanceId: "a6",
      teacherId: "u2",
      status: "PENDING",
      createdAt: "2026-07-25T10:00:00.000Z",
      updatedAt: "2026-07-25T10:00:00.000Z",
      ...input,
    });
    expect(validateCorrectionRequest(state, input).ok).toBe(false);
  });
});
