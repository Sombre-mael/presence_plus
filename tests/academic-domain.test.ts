import { describe, expect, it } from "vitest";
import { freshAdminData } from "../src/lib/admin-seed";
import { addAcademicDays, currentAcademicDate } from "../src/lib/academic-calendar";
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

  it("conserve l’effectif figé après un changement de promotion", () => {
    const state = freshAdminData();
    const session = state.sessions.find((item) => item.id === "session-002")!;
    session.status = "ACTIVE";
    session.enrolledStudentIds = ["u4"];
    const student = state.users.find((item) => item.id === "u4")!;
    student.promotionId = "p1";
    student.status = "INACTIVE";

    expect(getSessionRoster(state, session.id).map((item) => item.student.id)).toEqual(["u4"]);
  });

  it("refuse aussi de déplacer une session planifiée vers le passé", () => {
    const state = freshAdminData();
    const result = validateTeacherSession(state, {
      courseId: "c1",
      date: addAcademicDays(currentAcademicDate(), -1),
      startTime: "08:00",
      endTime: "10:00",
      room: "C20",
      lateThresholdMinutes: 10,
    }, "u2", "session-002");

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.endTime).toBeDefined();
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
    state.attendances = state.attendances.filter((item) => item.sessionId !== "session-003" || item.studentId !== "u10");
    const missingRecordCorrection = validateAttendanceInput(state, "session-003", {
      studentId: "u10",
      status: "PRESENT",
      checkedInAt: "14:02",
      source: "MANUAL",
    }, false);

    expect(missingExcuse.fieldErrors?.note).toBeDefined();
    expect(missingCorrectionReason.fieldErrors?.correctionReason).toBeDefined();
    expect(missingRecordCorrection.fieldErrors?.correctionReason).toBeDefined();
  });

  it("renouvelle le token QR par fenêtre de dix secondes", () => {
    const first = createQrToken("session-001", 20_000);
    const sameWindow = createQrToken("session-001", 29_999);
    const nextWindow = createQrToken("session-001", 30_000);

    expect(first.value).toBe(sameWindow.value);
    expect(nextWindow.value).not.toBe(first.value);
    expect(first.expiresAt).toBe(30_000);
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
