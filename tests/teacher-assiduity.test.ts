import { describe, expect, it } from "vitest";
import { freshAdminData } from "../src/lib/admin-seed";
import { getTeacherAssiduity, getTeacherCourses } from "../src/lib/teacher-assiduity";
import type { AttendanceStatus, SessionSummary } from "../src/types";

function fixture() {
  const state = freshAdminData();
  const course = state.courses.find((item) => item.teacherId === "u2")!;
  const student = state.users.find((item) => item.id === "u4")!;
  student.promotionId = course.promotionId;
  state.users = [student];
  state.courses = [course];
  state.sessions = [];
  state.attendances = [];
  state.correctionRequests = [];
  function add(status?: AttendanceStatus, date = "2026-09-10", lifecycle: SessionSummary["status"] = "COMPLETED") {
    const id = `s-${state.sessions.length}`;
    state.sessions.push({ id, courseId: course.id, courseCode: course.code, courseName: course.name, teacherId: "u2", teacher: "Patrick", promotionId: course.promotionId, promotion: "L2", date, startTime: "08:00", endTime: "10:00", room: "A1", status: lifecycle, presentCount: 0, expectedCount: 1, enrolledStudentIds: [student.id] });
    if (status) state.attendances.push({ id: `a-${id}`, sessionId: id, studentId: student.id, studentName: student.name, matricule: "M1", promotion: "L2", status });
  }
  return { state, student, course, add };
}

describe("assiduité enseignant", () => {
  it("sépare présence et ponctualité, exclut justifiées et résultats manquants", () => {
    const { state, add } = fixture();
    add("PRESENT"); add("LATE"); add("ABSENT"); add("EXCUSED"); add();
    const [row] = getTeacherAssiduity(state, "u2", "ALL", "2026-09-10");
    expect(row).toMatchObject({ attendanceRate: 67, punctualityRate: 50, eligible: 3, attended: 2, level: "ATTENTION", counts: { MISSING: 1, EXCUSED: 1 } });
  });

  it("recalcule immédiatement les taux après une correction", () => {
    const { state, add } = fixture(); add("ABSENT");
    expect(getTeacherAssiduity(state, "u2")[0].attendanceRate).toBe(0);
    state.attendances[0].status = "PRESENT";
    expect(getTeacherAssiduity(state, "u2")[0]).toMatchObject({ attendanceRate: 100, punctualityRate: 100, level: "REGULAR" });
  });

  it("ne compte ni séance active, ni annulation, ni séance future", () => {
    const { state, add } = fixture();
    add("ABSENT", "2026-09-10", "ACTIVE"); add("ABSENT", "2026-09-10", "CANCELLED"); add("ABSENT", "2026-09-11");
    expect(getTeacherAssiduity(state, "u2", "ALL", "2026-09-10")[0]).toMatchObject({ attendanceRate: null, level: "NO_DATA", history: [] });
  });

  it("conserve l’historique après changement de promotion et désactivation", () => {
    const { state, student, add } = fixture(); add("PRESENT");
    student.promotionId = "other"; student.status = "INACTIVE";
    expect(getTeacherAssiduity(state, "u2")[0]).toMatchObject({ attendanceRate: 100, currentEnrollment: false });
  });

  it("ne crée pas de faux résultats pour un nouvel inscrit", () => {
    const { state, add } = fixture(); add(); state.sessions[0].enrolledStudentIds = [];
    expect(getTeacherAssiduity(state, "u2")[0]).toMatchObject({ eligible: 0, history: [], level: "NO_DATA" });
  });

  it("respecte les bornes inclusives et le périmètre enseignant", () => {
    const { state, add } = fixture(); add("PRESENT", "2026-08-12"); add("ABSENT", "2026-08-11");
    expect(getTeacherAssiduity(state, "u2", "30", "2026-09-10")[0].attendanceRate).toBe(100);
    expect(getTeacherAssiduity(state, "other")).toEqual([]);
  });

  it("conserve les cours réaffectés uniquement à travers les anciennes séances", () => {
    const { state, course, add } = fixture(); add("PRESENT"); course.teacherId = "other";
    expect(getTeacherCourses(state, "u2")).toHaveLength(1);
    expect(getTeacherAssiduity(state, "u2")[0].currentEnrollment).toBe(false);
  });
});
