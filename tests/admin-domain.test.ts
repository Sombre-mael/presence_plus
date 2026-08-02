import { describe, expect, it } from "vitest";
import { freshAdminData } from "../src/lib/admin-seed";
import {
  getAdminAnomalies,
  getAdminDashboardStats,
  getAttendanceTrend,
  getCourseDeleteBlockers,
  getPromotionDeleteBlockers,
  getUserDeleteBlockers,
  isStoredAdminData,
  validateCourse,
  validatePromotion,
  validateUser,
} from "../src/lib/admin-domain";

describe("règles métier administrateur", () => {
  it("refuse une adresse e-mail déjà utilisée", () => {
    const state = freshAdminData();
    const result = validateUser(state, {
      name: "Nouvel utilisateur",
      email: "aline@presence.plus",
      role: "ADMIN",
      status: "ACTIVE",
    });

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.email).toBeDefined();
  });

  it("exige un matricule et une promotion pour un étudiant", () => {
    const result = validateUser(freshAdminData(), {
      name: "Nouvel étudiant",
      email: "nouveau@presence.plus",
      role: "STUDENT",
      status: "ACTIVE",
    });

    expect(result.ok).toBe(false);
    expect(result.fieldErrors).toMatchObject({
      matricule: expect.any(String),
      promotionId: expect.any(String),
    });
  });

  it("refuse un code de cours déjà utilisé", () => {
    const state = freshAdminData();
    const result = validateCourse(state, {
      code: "INF204",
      name: "Autre cours",
      teacherId: "u2",
      promotionId: "p2",
      weeklyHours: 2,
    });

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.code).toBeDefined();
  });

  it("aligne l’unicité des promotions sur la contrainte Neon", () => {
    const result = validatePromotion(freshAdminData(), {
      name: "L2 Informatique",
      department: "Sciences informatiques",
      academicYear: "2026-2027",
    });

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.name).toBeDefined();
  });

  it("bloque la suppression des entités possédant des dépendances", () => {
    const state = freshAdminData();

    expect(getUserDeleteBlockers(state, "u1")).not.toHaveLength(0);
    expect(getUserDeleteBlockers(state, "u2").join(" ")).toContain("cours");
    expect(getUserDeleteBlockers(state, "u4").join(" ")).toContain("historique");
    expect(getPromotionDeleteBlockers(state, "p2")).not.toHaveLength(0);
    expect(getCourseDeleteBlockers(state, "c1").join(" ")).toContain("sessions");
  });

  it("autorise une entité sans dépendance à franchir les gardes", () => {
    const state = freshAdminData();
    state.users.push({
      id: "free-user",
      name: "Compte libre",
      email: "libre@presence.plus",
      role: "ADMIN",
      status: "INACTIVE",
      createdAt: "2026-07-25T10:00:00.000Z",
    });

    expect(getUserDeleteBlockers(state, "free-user")).toEqual([]);
  });

  it("protège les sessions et le journal lors de la suppression d’un compte", () => {
    const state = freshAdminData();
    state.users.push({ id: "historical-user", name: "Compte historique", email: "historique@presence.plus", role: "TEACHER", status: "INACTIVE", createdAt: "2026-07-01T08:00:00.000Z" });
    state.sessions.push({ ...state.sessions[0], id: "historical-session", teacherId: "historical-user" });
    state.auditLogs.push({ id: "log-1", actorId: "historical-user", actorName: "Compte historique", action: "UPDATE_SESSION", entityType: "Session", entityId: "historical-session", createdAt: "2026-07-01T09:00:00.000Z" });

    const blockers = getUserDeleteBlockers(state, "historical-user").join(" ");
    expect(blockers).toContain("sessions");
    expect(blockers).toContain("journal");
  });

  it("calcule les indicateurs et les anomalies depuis les données", () => {
    const state = freshAdminData();
    const stats = getAdminDashboardStats(state);
    const anomalies = getAdminAnomalies(state);

    expect(stats.totalUsers).toBe(state.users.length);
    expect(stats.attendanceRate).toBeGreaterThan(0);
    expect(anomalies.some((item) => item.href.includes("/admin/sessions/"))).toBe(true);
    expect(anomalies.some((item) => item.href.includes("/admin/users"))).toBe(true);
  });

  it("exclut les sessions actives et annulées du taux consolidé", () => {
    const state = freshAdminData();
    const baseline = getAdminDashboardStats(state).attendanceRate;
    state.sessions.push(
      { ...state.sessions[0], id: "active-outlier", status: "ACTIVE", presentCount: 0, expectedCount: 100 },
      { ...state.sessions[0], id: "cancelled-outlier", status: "CANCELLED", presentCount: 0, expectedCount: 100 },
    );

    expect(getAdminDashboardStats(state).attendanceRate).toBe(baseline);
  });

  it("applique les périodes statistiques", () => {
    const state = freshAdminData();
    const sevenDays = getAttendanceTrend(state, { period: "7D", promotionId: "", courseId: "" });
    const semester = getAttendanceTrend(state, { period: "180D", promotionId: "", courseId: "" });

    expect(sevenDays.length).toBeLessThan(semester.length);
    expect(semester.every((point) => point.rate >= 0 && point.rate <= 100)).toBe(true);
  });

  it("rejette un stockage local incomplet ou obsolète", () => {
    expect(isStoredAdminData({ version: 2 })).toBe(false);
    expect(isStoredAdminData({ version: 1, users: [] })).toBe(false);
    expect(isStoredAdminData(freshAdminData())).toBe(true);
  });
});
