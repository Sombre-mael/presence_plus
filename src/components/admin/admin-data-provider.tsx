"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, RotateCcw, X } from "lucide-react";
import { freshAdminData } from "@/lib/admin-seed";
import {
  getAdminAnomalies,
  getAdminDashboardStats,
  getCourseDeleteBlockers,
  getPromotionDeleteBlockers,
  getUserDeleteBlockers,
  isStoredAdminData,
  validateCourse,
  validatePromotion,
  validateUser,
} from "@/lib/admin-domain";
import {
  getSessionRoster,
  migrateLegacyAdminData,
  recountSession,
  validateAttendanceInput,
  validateTeacherSession,
} from "@/lib/academic-domain";
import {
  attendanceFromCheckIn,
  teacherIdForSession,
  validateCheckInConfirmation,
  validateCorrectionRequest,
} from "@/lib/student-domain";
import type {
  AcademicDataState,
  AdminCourseInput,
  AdminDataState,
  AdminPromotionInput,
  AdminUserInput,
  MutationResult,
  AttendanceInput,
  TeacherSessionInput,
} from "@/types/admin";
import type { AttendanceRecord } from "@/types";
import type {
  CheckInValidationResult,
  CorrectionRequestInput,
  CorrectionResolutionInput,
  StudentCheckInInput,
} from "@/types/student";
import { Button } from "@/components/ui/button";

export const ACADEMIC_STORAGE_KEY = "presence-plus:academic-data:v3";
const PREVIOUS_STORAGE_KEY = "presence-plus:academic-data:v2";
const LEGACY_STORAGE_KEY = "presence-plus:admin-data:v1";

export interface AcademicDataContextValue {
  state: AcademicDataState;
  hydrated: boolean;
  stats: ReturnType<typeof getAdminDashboardStats>;
  anomalies: ReturnType<typeof getAdminAnomalies>;
  createUser: (input: AdminUserInput) => MutationResult;
  updateUser: (id: string, input: AdminUserInput) => MutationResult;
  deleteUser: (id: string) => MutationResult;
  createPromotion: (input: AdminPromotionInput) => MutationResult;
  updatePromotion: (id: string, input: AdminPromotionInput) => MutationResult;
  deletePromotion: (id: string) => MutationResult;
  createCourse: (input: AdminCourseInput) => MutationResult;
  updateCourse: (id: string, input: AdminCourseInput) => MutationResult;
  deleteCourse: (id: string) => MutationResult;
  createSession: (input: TeacherSessionInput, teacherId: string) => MutationResult & { id?: string };
  updateSession: (id: string, input: TeacherSessionInput, teacherId: string) => MutationResult;
  startSession: (id: string, teacherId: string) => MutationResult;
  cancelSession: (id: string, reason?: string) => MutationResult;
  completeSession: (id: string, teacherId: string) => MutationResult;
  saveAttendance: (sessionId: string, input: AttendanceInput, teacherId: string) => MutationResult;
  submitStudentCheckIn: (input: StudentCheckInInput) => CheckInValidationResult;
  createCorrectionRequest: (input: CorrectionRequestInput) => MutationResult;
  cancelCorrectionRequest: (id: string, studentId: string) => MutationResult;
  resolveCorrectionRequest: (input: CorrectionResolutionInput) => MutationResult;
  resetData: () => void;
  notify: (message: string) => void;
}

const AdminDataContext = createContext<AcademicDataContextValue | null>(null);

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdminDataState>(() => freshAdminData());
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState("");
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(ACADEMIC_STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (isStoredAdminData(parsed)) setState(parsed);
          else window.localStorage.removeItem(ACADEMIC_STORAGE_KEY);
        } else {
          const previousRaw = window.localStorage.getItem(PREVIOUS_STORAGE_KEY);
          const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
          const migrated = previousRaw
            ? migrateLegacyAdminData(JSON.parse(previousRaw))
            : legacyRaw
              ? migrateLegacyAdminData(JSON.parse(legacyRaw))
              : null;
          if (migrated) {
            setState(migrated);
            window.localStorage.setItem(ACADEMIC_STORAGE_KEY, JSON.stringify(migrated));
          }
        }
      } catch {
        window.localStorage.removeItem(ACADEMIC_STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(ACADEMIC_STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  useEffect(() => {
    function syncStorage(event: StorageEvent) {
      if (event.key !== ACADEMIC_STORAGE_KEY || !event.newValue) return;
      try {
        const parsed: unknown = JSON.parse(event.newValue);
        if (isStoredAdminData(parsed)) setState(parsed);
      } catch {
        // The active tab keeps its valid state when another tab writes invalid data.
      }
    }
    window.addEventListener("storage", syncStorage);
    return () => window.removeEventListener("storage", syncStorage);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const notify = useCallback((message: string) => setToast(message), []);
  const commit = useCallback((update: (current: AdminDataState) => AdminDataState) => {
    setState((current) => {
      const next = update(current);
      window.localStorage.setItem(ACADEMIC_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const createUser = useCallback((input: AdminUserInput) => {
    const result = validateUser(state, input);
    if (!result.ok) return result;
    commit((current) => ({
      ...current,
      users: [...current.users, {
        ...input,
        id: nanoid(8),
        email: input.email.trim().toLocaleLowerCase("fr"),
        matricule: input.role === "STUDENT" ? input.matricule?.trim().toLocaleUpperCase("fr") : undefined,
        promotionId: input.role === "STUDENT" ? input.promotionId : undefined,
        createdAt: new Date().toISOString(),
      }],
    }));
    notify(result.message);
    return result;
  }, [commit, notify, state]);

  const updateUser = useCallback((id: string, input: AdminUserInput) => {
    const result = validateUser(state, input, id);
    if (!result.ok) return result;
    commit((current) => ({
      ...current,
      users: current.users.map((user) => user.id === id ? {
        ...user,
        ...input,
        email: input.email.trim().toLocaleLowerCase("fr"),
        matricule: input.role === "STUDENT" ? input.matricule?.trim().toLocaleUpperCase("fr") : undefined,
        promotionId: input.role === "STUDENT" ? input.promotionId : undefined,
      } : user),
    }));
    notify(result.message);
    return result;
  }, [commit, notify, state]);

  const deleteUser = useCallback((id: string) => {
    const blockers = getUserDeleteBlockers(state, id);
    if (blockers.length) return { ok: false, message: blockers.join(" ") };
    commit((current) => ({ ...current, users: current.users.filter((user) => user.id !== id) }));
    const result = { ok: true, message: "Utilisateur supprimé." };
    notify(result.message);
    return result;
  }, [commit, notify, state]);

  const createPromotion = useCallback((input: AdminPromotionInput) => {
    const result = validatePromotion(state, input);
    if (!result.ok) return result;
    commit((current) => ({
      ...current,
      promotions: [...current.promotions, { ...input, id: nanoid(8), createdAt: new Date().toISOString() }],
    }));
    notify(result.message);
    return result;
  }, [commit, notify, state]);

  const updatePromotion = useCallback((id: string, input: AdminPromotionInput) => {
    const result = validatePromotion(state, input, id);
    if (!result.ok) return result;
    commit((current) => ({
      ...current,
      promotions: current.promotions.map((promotion) => promotion.id === id ? { ...promotion, ...input } : promotion),
    }));
    notify(result.message);
    return result;
  }, [commit, notify, state]);

  const deletePromotion = useCallback((id: string) => {
    const blockers = getPromotionDeleteBlockers(state, id);
    if (blockers.length) return { ok: false, message: blockers.join(" ") };
    commit((current) => ({ ...current, promotions: current.promotions.filter((promotion) => promotion.id !== id) }));
    const result = { ok: true, message: "Promotion supprimée." };
    notify(result.message);
    return result;
  }, [commit, notify, state]);

  const createCourse = useCallback((input: AdminCourseInput) => {
    const result = validateCourse(state, input);
    if (!result.ok) return result;
    commit((current) => ({
      ...current,
      courses: [...current.courses, {
        ...input,
        code: input.code.trim().toLocaleUpperCase("fr"),
        name: input.name.trim(),
        id: nanoid(8),
        createdAt: new Date().toISOString(),
      }],
    }));
    notify(result.message);
    return result;
  }, [commit, notify, state]);

  const updateCourse = useCallback((id: string, input: AdminCourseInput) => {
    const result = validateCourse(state, input, id);
    if (!result.ok) return result;
    commit((current) => ({
      ...current,
      courses: current.courses.map((course) => course.id === id ? {
        ...course,
        ...input,
        code: input.code.trim().toLocaleUpperCase("fr"),
        name: input.name.trim(),
      } : course),
    }));
    notify(result.message);
    return result;
  }, [commit, notify, state]);

  const deleteCourse = useCallback((id: string) => {
    const blockers = getCourseDeleteBlockers(state, id);
    if (blockers.length) return { ok: false, message: blockers.join(" ") };
    commit((current) => ({ ...current, courses: current.courses.filter((course) => course.id !== id) }));
    const result = { ok: true, message: "Cours supprimé." };
    notify(result.message);
    return result;
  }, [commit, notify, state]);

  const createSession = useCallback((input: TeacherSessionInput, teacherId: string) => {
    const result = validateTeacherSession(state, input, teacherId);
    if (!result.ok) return result;
    const course = state.courses.find((item) => item.id === input.courseId)!;
    const teacher = state.users.find((item) => item.id === teacherId)!;
    const promotion = state.promotions.find((item) => item.id === course.promotionId)!;
    const id = `session-${nanoid(8)}`;
    const expectedCount = state.users.filter((user) =>
      user.role === "STUDENT" && user.status === "ACTIVE" && user.promotionId === course.promotionId).length;
    commit((current) => ({
      ...current,
      sessions: [...current.sessions, {
        id,
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        teacher: teacher.name,
        teacherId,
        promotion: promotion.name,
        promotionId: promotion.id,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        room: input.room.trim(),
        status: "SCHEDULED",
        presentCount: 0,
        expectedCount,
        lateThresholdMinutes: input.lateThresholdMinutes,
        createdAt: new Date().toISOString(),
      }],
    }));
    notify(result.message);
    return { ...result, id };
  }, [commit, notify, state]);

  const updateSession = useCallback((id: string, input: TeacherSessionInput, teacherId: string) => {
    const session = state.sessions.find((item) => item.id === id);
    if (!session || session.status !== "SCHEDULED") {
      return { ok: false, message: "Seule une session planifiée peut être modifiée." };
    }
    const result = validateTeacherSession(state, input, teacherId, id);
    if (!result.ok) return result;
    const course = state.courses.find((item) => item.id === input.courseId)!;
    const promotion = state.promotions.find((item) => item.id === course.promotionId)!;
    commit((current) => ({
      ...current,
      sessions: current.sessions.map((item) => item.id === id ? {
        ...item,
        ...input,
        courseCode: course.code,
        courseName: course.name,
        promotion: promotion.name,
        promotionId: promotion.id,
        room: input.room.trim(),
      } : item),
    }));
    notify(result.message);
    return result;
  }, [commit, notify, state]);

  const startSession = useCallback((id: string, teacherId: string) => {
    const session = state.sessions.find((item) => item.id === id);
    if (!session || session.status !== "SCHEDULED") {
      return { ok: false, message: "Cette session ne peut pas être démarrée." };
    }
    if (state.sessions.some((item) => item.id !== id && item.teacherId === teacherId && item.status === "ACTIVE")) {
      return { ok: false, message: "Clôturez votre session active avant d’en démarrer une autre." };
    }
    commit((current) => ({
      ...current,
      sessions: current.sessions.map((item) => item.id === id ? {
        ...item,
        status: "ACTIVE",
        startedAt: new Date().toISOString(),
      } : item),
    }));
    const result = { ok: true, message: "Session démarrée. Le pointage est ouvert." };
    notify(result.message);
    return result;
  }, [commit, notify, state]);

  const cancelSession = useCallback((id: string, reason?: string) => {
    const session = state.sessions.find((item) => item.id === id);
    if (!session || session.status !== "SCHEDULED") {
      return { ok: false, message: "Seule une session planifiée peut être annulée." };
    }
    commit((current) => ({
      ...current,
      sessions: current.sessions.map((item) => item.id === id ? {
        ...item,
        status: "CANCELLED",
        cancelledAt: new Date().toISOString(),
        cancellationReason: reason?.trim() || "Session annulée par l’enseignant.",
      } : item),
    }));
    const result = { ok: true, message: "Session annulée." };
    notify(result.message);
    return result;
  }, [commit, notify, state]);

  const completeSession = useCallback((id: string, teacherId: string) => {
    const session = state.sessions.find((item) => item.id === id);
    if (!session || session.status !== "ACTIVE") {
      return { ok: false, message: "Cette session n’est pas active." };
    }
    const roster = getSessionRoster(state, id);
    const missing: AttendanceRecord[] = roster
      .filter((item) => !item.attendance)
      .map(({ student }) => ({
        id: `attendance-${nanoid(8)}`,
        sessionId: id,
        studentId: student.id,
        studentName: student.name,
        matricule: student.matricule ?? "—",
        promotion: session.promotion,
        status: "ABSENT",
        source: "MANUAL",
        note: "Absence enregistrée automatiquement à la clôture.",
        correctedBy: teacherId,
      }));
    commit((current) => ({
      ...current,
      attendances: [...current.attendances, ...missing],
      sessions: current.sessions.map((item) => item.id === id ? {
        ...recountSession(item, [...current.attendances, ...missing]),
        status: "COMPLETED",
        completedAt: new Date().toISOString(),
      } : item),
    }));
    const result = { ok: true, message: `Session clôturée. ${missing.length} absence(s) enregistrée(s).` };
    notify(result.message);
    return result;
  }, [commit, notify, state]);

  const saveAttendance = useCallback((sessionId: string, input: AttendanceInput, teacherId: string) => {
    const existing = state.attendances.find(
      (item) => item.sessionId === sessionId && item.studentId === input.studentId,
    );
    const result = validateAttendanceInput(state, sessionId, input, Boolean(existing));
    if (!result.ok) return result;
    const session = state.sessions.find((item) => item.id === sessionId)!;
    const student = state.users.find((item) => item.id === input.studentId)!;
    const record: AttendanceRecord = {
      id: existing?.id ?? `attendance-${nanoid(8)}`,
      sessionId,
      studentId: student.id,
      studentName: student.name,
      matricule: student.matricule ?? "—",
      promotion: session.promotion,
      status: input.status,
      checkedInAt: input.checkedInAt,
      source: input.source,
      note: input.note?.trim() || undefined,
      correctionReason: input.correctionReason?.trim() || undefined,
      correctedAt: existing ? new Date().toISOString() : undefined,
      correctedBy: existing ? teacherId : undefined,
    };
    commit((current) => {
      const attendances = existing
        ? current.attendances.map((item) => item.id === existing.id ? record : item)
        : [...current.attendances, record];
      return {
        ...current,
        attendances,
        sessions: current.sessions.map((item) =>
          item.id === sessionId ? recountSession(item, attendances) : item),
      };
    });
    notify(result.message);
    return result;
  }, [commit, notify, state]);

  const submitStudentCheckIn = useCallback((input: StudentCheckInInput): CheckInValidationResult => {
    const result = validateCheckInConfirmation(state, input);
    if (!result.ok) return result;
    if (result.alreadyRecorded) {
      notify("Votre présence est déjà enregistrée pour cette session.");
      return result;
    }
    const record = attendanceFromCheckIn(state, input, `attendance-${nanoid(8)}`);
    commit((current) => {
      const attendances = [...current.attendances, record];
      return {
        ...current,
        attendances,
        sessions: current.sessions.map((session) =>
          session.id === input.sessionId ? recountSession(session, attendances) : session),
      };
    });
    notify(record.status === "LATE" ? "Présence enregistrée avec retard." : "Présence confirmée.");
    return result;
  }, [commit, notify, state]);

  const createCorrectionRequest = useCallback((input: CorrectionRequestInput) => {
    const result = validateCorrectionRequest(state, input);
    if (!result.ok) return result;
    const teacherId = teacherIdForSession(state, input.sessionId);
    if (!teacherId) return { ok: false, message: "L’enseignant de cette session est introuvable." };
    const now = new Date().toISOString();
    const attendance = state.attendances.find(
      (item) => item.sessionId === input.sessionId && item.studentId === input.studentId,
    );
    commit((current) => ({
      ...current,
      correctionRequests: [...current.correctionRequests, {
        id: `request-${nanoid(8)}`,
        sessionId: input.sessionId,
        attendanceId: attendance?.id,
        studentId: input.studentId,
        teacherId,
        requestedStatus: input.requestedStatus,
        reason: input.reason.trim(),
        status: "PENDING",
        createdAt: now,
        updatedAt: now,
      }],
    }));
    notify(result.message);
    return result;
  }, [commit, notify, state]);

  const cancelCorrectionRequest = useCallback((id: string, studentId: string) => {
    const request = state.correctionRequests.find((item) => item.id === id);
    if (!request || request.studentId !== studentId || request.status !== "PENDING") {
      return { ok: false, message: "Cette demande ne peut plus être annulée." };
    }
    commit((current) => ({
      ...current,
      correctionRequests: current.correctionRequests.map((item) => item.id === id ? {
        ...item,
        status: "CANCELLED",
        updatedAt: new Date().toISOString(),
      } : item),
    }));
    const result = { ok: true, message: "Demande annulée." };
    notify(result.message);
    return result;
  }, [commit, notify, state]);

  const resolveCorrectionRequest = useCallback((input: CorrectionResolutionInput): MutationResult => {
    const request = state.correctionRequests.find((item) => item.id === input.requestId);
    if (!request || request.teacherId !== input.teacherId || request.status !== "PENDING") {
      return { ok: false, message: "Cette demande n’est plus disponible." };
    }
    if (input.reason.trim().length < 5) {
      return {
        ok: false,
        message: "Expliquez votre décision en au moins 5 caractères.",
        fieldErrors: { reason: "Motif trop court." },
      };
    }
    if (input.decision === "APPROVE" && !input.resolvedStatus) {
      return {
        ok: false,
        message: "Choisissez le statut final.",
        fieldErrors: { resolvedStatus: "Statut requis." },
      };
    }
    const session = state.sessions.find((item) => item.id === request.sessionId)!;
    const student = state.users.find((item) => item.id === request.studentId)!;
    const existing = state.attendances.find(
      (item) => item.sessionId === request.sessionId && item.studentId === request.studentId,
    );
    const now = new Date().toISOString();

    commit((current) => {
      let attendances = current.attendances;
      if (input.decision === "APPROVE" && input.resolvedStatus) {
        const record: AttendanceRecord = {
          id: existing?.id ?? `attendance-${nanoid(8)}`,
          sessionId: session.id,
          studentId: student.id,
          studentName: student.name,
          matricule: student.matricule ?? "—",
          promotion: session.promotion,
          status: input.resolvedStatus,
          checkedInAt: ["PRESENT", "LATE"].includes(input.resolvedStatus)
            ? input.checkedInAt ?? existing?.checkedInAt ?? session.startTime
            : undefined,
          source: existing?.source ?? "MANUAL",
          note: input.resolvedStatus === "EXCUSED" ? request.reason : existing?.note,
          correctionReason: `${request.reason} · Décision enseignant: ${input.reason.trim()}`,
          correctedAt: now,
          correctedBy: input.teacherId,
        };
        attendances = existing
          ? current.attendances.map((item) => item.id === existing.id ? record : item)
          : [...current.attendances, record];
      }
      return {
        ...current,
        attendances,
        sessions: current.sessions.map((item) =>
          item.id === session.id ? recountSession(item, attendances) : item),
        correctionRequests: current.correctionRequests.map((item) => item.id === request.id ? {
          ...item,
          status: input.decision === "APPROVE" ? "APPROVED" : "REJECTED",
          updatedAt: now,
          decisionReason: input.reason.trim(),
          resolvedStatus: input.decision === "APPROVE" ? input.resolvedStatus : undefined,
          resolvedBy: input.teacherId,
        } : item),
      };
    });
    const result = {
      ok: true,
      message: input.decision === "APPROVE" ? "Correction acceptée et appliquée." : "Demande refusée.",
    };
    notify(result.message);
    return result;
  }, [commit, notify, state]);

  const resetData = useCallback(() => {
    const next = freshAdminData();
    setState(next);
    window.localStorage.setItem(ACADEMIC_STORAGE_KEY, JSON.stringify(next));
    notify("Données de démonstration restaurées.");
  }, [notify]);

  const value = useMemo<AcademicDataContextValue>(() => ({
    state,
    hydrated,
    stats: getAdminDashboardStats(state),
    anomalies: getAdminAnomalies(state),
    createUser,
    updateUser,
    deleteUser,
    createPromotion,
    updatePromotion,
    deletePromotion,
    createCourse,
    updateCourse,
    deleteCourse,
    createSession,
    updateSession,
    startSession,
    cancelSession,
    completeSession,
    saveAttendance,
    submitStudentCheckIn,
    createCorrectionRequest,
    cancelCorrectionRequest,
    resolveCorrectionRequest,
    resetData,
    notify,
  }), [
    state, hydrated, createUser, updateUser, deleteUser, createPromotion, updatePromotion,
    deletePromotion, createCourse, updateCourse, deleteCourse, createSession, updateSession,
    startSession, cancelSession, completeSession, saveAttendance, submitStudentCheckIn,
    createCorrectionRequest, cancelCorrectionRequest, resolveCorrectionRequest, resetData, notify,
  ]);

  return (
    <AdminDataContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
            className="fixed bottom-4 right-4 z-[80] flex max-w-sm items-center gap-3 border bg-background px-4 py-3 shadow-lg"
            role="status"
          >
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span className="text-sm font-medium">{toast}</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setToast("")} aria-label="Fermer la notification">
              <X />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      {!hydrated && (
        <div className="pointer-events-none fixed bottom-4 left-4 z-[80] flex items-center gap-2 bg-foreground px-3 py-2 text-xs text-background">
          <RotateCcw className="size-3.5 animate-spin" />
          Restauration de l’espace
        </div>
      )}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const context = useContext(AdminDataContext);
  if (!context) throw new Error("useAdminData doit être utilisé dans AdminDataProvider.");
  return context;
}

export const AcademicDataProvider = AdminDataProvider;

export function useAcademicData() {
  return useAdminData();
}
