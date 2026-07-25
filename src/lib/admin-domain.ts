import { z } from "zod";
import type {
  AdminAnomaly,
  AdminCourseInput,
  AdminDashboardStats,
  AdminDataState,
  AdminPromotionInput,
  AdminUserInput,
  AttendanceTrendPoint,
  MutationResult,
  StatisticsFilters,
} from "@/types/admin";
import { isStoredAcademicData } from "./academic-domain";

const requiredText = z.string().trim().min(2, "Ce champ doit contenir au moins 2 caractères.");

export const adminUserSchema = z.object({
  name: requiredText,
  email: z.email("Saisissez une adresse e-mail valide."),
  role: z.enum(["ADMIN", "TEACHER", "STUDENT"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  promotionId: z.string().optional(),
  matricule: z.string().trim().optional(),
}).superRefine((value, context) => {
  if (value.role === "STUDENT" && !value.promotionId) {
    context.addIssue({ code: "custom", path: ["promotionId"], message: "Sélectionnez une promotion." });
  }
  if (value.role === "STUDENT" && (!value.matricule || value.matricule.length < 4)) {
    context.addIssue({ code: "custom", path: ["matricule"], message: "Saisissez un matricule valide." });
  }
});

export const adminPromotionSchema = z.object({
  name: requiredText,
  department: requiredText,
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, "Utilisez le format 2025-2026."),
});

export const adminCourseSchema = z.object({
  code: z.string().trim().min(3, "Le code doit contenir au moins 3 caractères.").max(12),
  name: requiredText,
  teacherId: z.string().min(1, "Sélectionnez un enseignant."),
  promotionId: z.string().min(1, "Sélectionnez une promotion."),
  weeklyHours: z.coerce.number().int().min(1, "Minimum 1 heure.").max(20, "Maximum 20 heures."),
});

function fieldErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

export function validateUser(
  state: AdminDataState,
  input: AdminUserInput,
  editingId?: string,
): MutationResult {
  const parsed = adminUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Vérifiez les informations saisies.", fieldErrors: fieldErrors(parsed.error) };
  }
  const email = input.email.trim().toLocaleLowerCase("fr");
  if (state.users.some((user) => user.id !== editingId && user.email.toLocaleLowerCase("fr") === email)) {
    return { ok: false, message: "Cette adresse e-mail est déjà utilisée.", fieldErrors: { email: "Adresse déjà utilisée." } };
  }
  const matricule = input.matricule?.trim();
  if (matricule && state.users.some((user) => user.id !== editingId && user.matricule === matricule)) {
    return { ok: false, message: "Ce matricule est déjà utilisé.", fieldErrors: { matricule: "Matricule déjà utilisé." } };
  }
  return { ok: true, message: editingId ? "Utilisateur mis à jour." : "Utilisateur ajouté." };
}

export function validatePromotion(
  state: AdminDataState,
  input: AdminPromotionInput,
  editingId?: string,
): MutationResult {
  const parsed = adminPromotionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Vérifiez les informations saisies.", fieldErrors: fieldErrors(parsed.error) };
  }
  const duplicate = state.promotions.some(
    (promotion) =>
      promotion.id !== editingId &&
      promotion.name.toLocaleLowerCase("fr") === input.name.trim().toLocaleLowerCase("fr") &&
      promotion.academicYear === input.academicYear,
  );
  return duplicate
    ? { ok: false, message: "Cette promotion existe déjà pour cette année.", fieldErrors: { name: "Promotion déjà existante." } }
    : { ok: true, message: editingId ? "Promotion mise à jour." : "Promotion ajoutée." };
}

export function validateCourse(
  state: AdminDataState,
  input: AdminCourseInput,
  editingId?: string,
): MutationResult {
  const parsed = adminCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Vérifiez les informations saisies.", fieldErrors: fieldErrors(parsed.error) };
  }
  if (state.courses.some((course) => course.id !== editingId && course.code.toLocaleUpperCase("fr") === input.code.trim().toLocaleUpperCase("fr"))) {
    return { ok: false, message: "Ce code de cours est déjà utilisé.", fieldErrors: { code: "Code déjà utilisé." } };
  }
  if (!state.users.some((user) => user.id === input.teacherId && user.role === "TEACHER" && user.status === "ACTIVE")) {
    return { ok: false, message: "L’enseignant sélectionné est indisponible.", fieldErrors: { teacherId: "Enseignant indisponible." } };
  }
  if (!state.promotions.some((promotion) => promotion.id === input.promotionId)) {
    return { ok: false, message: "La promotion sélectionnée est introuvable.", fieldErrors: { promotionId: "Promotion introuvable." } };
  }
  return { ok: true, message: editingId ? "Cours mis à jour." : "Cours ajouté." };
}

export function getUserDeleteBlockers(state: AdminDataState, id: string, currentUserId = "u1"): string[] {
  const user = state.users.find((item) => item.id === id);
  if (!user) return ["Cet utilisateur n’existe plus."];
  const blockers: string[] = [];
  if (id === currentUserId) blockers.push("Le compte administrateur actuellement utilisé ne peut pas être supprimé.");
  const assignedCourses = state.courses.filter((course) => course.teacherId === id);
  if (assignedCourses.length) blockers.push(`${assignedCourses.length} cours sont encore affectés à cet enseignant.`);
  if (state.attendances.some((attendance) => attendance.studentId === id)) {
    blockers.push("Un historique de présence est associé à cet étudiant.");
  }
  return blockers;
}

export function getPromotionDeleteBlockers(state: AdminDataState, id: string): string[] {
  const studentCount = state.users.filter((user) => user.promotionId === id).length;
  const linkedCourses = state.courses.filter((course) => course.promotionId === id);
  const blockers: string[] = [];
  if (studentCount) blockers.push(`${studentCount} étudiants appartiennent encore à cette promotion.`);
  if (linkedCourses.length) blockers.push(`${linkedCourses.length} cours utilisent encore cette promotion.`);
  if (linkedCourses.some((course) => state.sessions.some((session) => session.courseId === course.id))) {
    blockers.push("Des sessions historiques sont liées aux cours de cette promotion.");
  }
  return blockers;
}

export function getCourseDeleteBlockers(state: AdminDataState, id: string): string[] {
  const sessionCount = state.sessions.filter((session) => session.courseId === id).length;
  return sessionCount ? [`${sessionCount} sessions sont liées à ce cours.`] : [];
}

export function getAdminDashboardStats(state: AdminDataState): AdminDashboardStats {
  const completed = state.sessions.filter((session) =>
    ["ACTIVE", "COMPLETED"].includes(session.status) && session.expectedCount > 0);
  const present = completed.reduce((total, session) => total + session.presentCount, 0);
  const expected = completed.reduce((total, session) => total + session.expectedCount, 0);
  return {
    activeUsers: state.users.filter((user) => user.status === "ACTIVE").length,
    totalUsers: state.users.length,
    attendanceRate: expected ? Math.round((present / expected) * 100) : 0,
    sessionsToday: state.sessions.filter((session) => session.date === "2026-07-25").length,
    activeSessions: state.sessions.filter((session) => session.status === "ACTIVE").length,
    promotionCount: state.promotions.length,
    studentCount: state.users.filter((user) => user.role === "STUDENT").length,
  };
}

export function getAdminAnomalies(state: AdminDataState): AdminAnomaly[] {
  const anomalies: AdminAnomaly[] = [];
  for (const session of state.sessions.filter((item) => item.status === "ACTIVE")) {
    const rate = session.expectedCount ? Math.round((session.presentCount / session.expectedCount) * 100) : 0;
    if (rate < 80) {
      anomalies.push({
        id: `session-${session.id}`,
        severity: "HIGH",
        title: "Participation sous le seuil",
        detail: `${session.courseCode} est à ${rate}% de présence.`,
        href: `/admin/sessions/${session.id}`,
      });
    }
  }
  const inactive = state.users.filter((user) => user.status === "INACTIVE");
  if (inactive.length) {
    anomalies.push({
      id: "inactive-users",
      severity: "MEDIUM",
      title: "Comptes inactifs à vérifier",
      detail: `${inactive.length} compte${inactive.length > 1 ? "s" : ""} nécessite${inactive.length > 1 ? "nt" : ""} une décision.`,
      href: "/admin/users?status=INACTIVE",
    });
  }
  for (const course of state.courses) {
    if (!state.users.some((user) => user.id === course.teacherId && user.status === "ACTIVE")) {
      anomalies.push({
        id: `course-${course.id}`,
        severity: "MEDIUM",
        title: "Affectation incomplète",
        detail: `${course.code} n’a pas d’enseignant actif.`,
        href: `/admin/courses?course=${course.id}`,
      });
    }
  }
  return anomalies;
}

function periodDays(period: StatisticsFilters["period"]) {
  if (period === "7D") return 7;
  if (period === "30D") return 30;
  return 180;
}

export function getFilteredSessions(state: AdminDataState, filters: StatisticsFilters) {
  const anchor = new Date("2026-07-25T12:00:00");
  const minimum = new Date(anchor);
  minimum.setDate(anchor.getDate() - periodDays(filters.period));
  const promotion = state.promotions.find((item) => item.id === filters.promotionId);
  return state.sessions.filter((session) => {
    const course = state.courses.find((item) => item.id === session.courseId);
    return (
      new Date(`${session.date}T12:00:00`) >= minimum &&
      (!filters.courseId || session.courseId === filters.courseId) &&
      (!filters.promotionId || course?.promotionId === filters.promotionId || session.promotion === promotion?.name)
    );
  });
}

export function getAttendanceTrend(state: AdminDataState, filters: StatisticsFilters): AttendanceTrendPoint[] {
  return getFilteredSessions(state, filters)
    .filter((session) => ["ACTIVE", "COMPLETED"].includes(session.status))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((session) => {
      const late = Math.max(1, Math.round(session.presentCount * 0.08));
      const present = Math.max(0, session.presentCount - late);
      const absent = Math.max(0, session.expectedCount - session.presentCount);
      return {
        label: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(`${session.date}T12:00:00`)),
        date: session.date,
        present,
        late,
        absent,
        rate: session.expectedCount ? Math.round((session.presentCount / session.expectedCount) * 100) : 0,
      };
    });
}

export function isStoredAdminData(value: unknown): value is AdminDataState {
  return isStoredAcademicData(value);
}
