import { describe, expect, it } from "vitest";
import { freshAdminData } from "../src/lib/admin-seed";
import {
  createQrToken,
  deriveAttendanceStatus,
  getSessionRoster,
  isStoredAcademicData,
  migrateLegacyAdminData,
  validateAttendanceInput,
  validateTeacherSession,
} from "../src/lib/academic-domain";

describe("règles métier enseignant", () => {
  it("limite la création aux cours affectés à l’enseignant", () => {
    const result = validateTeacherSession(freshAdminData(), {
      courseId: "c2",
      date: "2026-07-28",
      startTime: "08:00",
      endTime: "10:00",
      room: "C12",
      lateThresholdMinutes: 10,
    }, "u2");

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.courseId).toBeDefined();
  });

  it("bloque les chevauchements d’enseignant et de salle", () => {
    const state = freshAdminData();
    const teacherConflict = validateTeacherSession(state, {
      courseId: "c3",
      date: "2026-07-25",
      startTime: "08:30",
      endTime: "09:30",
      room: "A20",
      lateThresholdMinutes: 10,
    }, "u2");
    const roomConflict = validateTeacherSession(state, {
      courseId: "c3",
      date: "2026-07-25",
      startTime: "08:30",
      endTime: "09:30",
      room: "B12",
      lateThresholdMinutes: 10,
    }, "u2");

    expect(teacherConflict.ok).toBe(false);
    expect(roomConflict.message).toContain("salle");
  });

  it("détermine un retard selon la tolérance de la séance", () => {
    expect(deriveAttendanceStatus("08:00", "08:10", 10)).toBe("PRESENT");
    expect(deriveAttendanceStatus("08:00", "08:11", 10)).toBe("LATE");
  });

  it("construit la feuille de présence depuis toute la promotion", () => {
    const state = freshAdminData();
    const roster = getSessionRoster(state, "session-002");
    const promotionStudents = state.users.filter(
      (user) => user.role === "STUDENT" && user.status === "ACTIVE" && user.promotionId === "p2",
    );

    expect(roster).toHaveLength(promotionStudents.length);
    expect(roster.some((item) => !item.attendance)).toBe(true);
  });

  it("exige une justification et un motif de correction après clôture", () => {
    const state = freshAdminData();
    const missingExcuse = validateAttendanceInput(state, "session-003", {
      studentId: "u10",
      status: "EXCUSED",
      source: "MANUAL",
    }, true);
    const missingCorrectionReason = validateAttendanceInput(state, "session-003", {
      studentId: "u10",
      status: "PRESENT",
      source: "MANUAL",
      note: "Justificatif reçu",
    }, true);

    expect(missingExcuse.fieldErrors?.note).toBeDefined();
    expect(missingCorrectionReason.fieldErrors?.correctionReason).toBeDefined();
  });

  it("renouvelle le token QR par fenêtre de trente secondes", () => {
    const first = createQrToken("session-001", 60_000);
    const sameWindow = createQrToken("session-001", 89_999);
    const nextWindow = createQrToken("session-001", 90_000);

    expect(first.value).toBe(sameWindow.value);
    expect(nextWindow.value).not.toBe(first.value);
    expect(first.expiresAt).toBe(90_000);
  });

  it("migre les stockages précédents vers le modèle académique v3", () => {
    const current = freshAdminData();
    const legacy = { ...current, version: 1 };
    const previous = { ...current, version: 2 };
    const migrated = migrateLegacyAdminData(legacy);
    const migratedPrevious = migrateLegacyAdminData(previous);

    expect(migrated?.version).toBe(3);
    expect(migratedPrevious?.version).toBe(3);
    expect(migratedPrevious?.correctionRequests).toEqual([]);
    expect(migrated?.sessions[0].teacherId).toBeDefined();
    expect(isStoredAcademicData(migrated)).toBe(true);
    expect(migrateLegacyAdminData({ version: 1, users: [] })).toBeNull();
  });
});
