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

  it("calcule les indicateurs et les anomalies depuis les données", () => {
    const state = freshAdminData();
    const stats = getAdminDashboardStats(state);
    const anomalies = getAdminAnomalies(state);

    expect(stats.totalUsers).toBe(state.users.length);
    expect(stats.attendanceRate).toBeGreaterThan(0);
    expect(anomalies.some((item) => item.href.includes("/admin/sessions/"))).toBe(true);
    expect(anomalies.some((item) => item.href.includes("/admin/users"))).toBe(true);
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
