"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, RotateCcw, X } from "lucide-react";
import {
  cancelCorrectionRequestAction,
  cancelSessionAction,
  completeSessionAction,
  confirmStudentCheckInAction,
  createCorrectionRequestAction,
  createCourseAction,
  createPromotionAction,
  createSessionAction,
  createUserAction,
  deleteCourseAction,
  deletePromotionAction,
  deleteUserAction,
  loadAcademicDataAction,
  resolveCorrectionRequestAction,
  saveAttendanceAction,
  setCourseActiveAction,
  setUserStatusAction,
  startSessionAction,
  updateCourseAction,
  updatePromotionAction,
  updateSessionAction,
  updateUserAction,
  validateStudentCodeAction,
  type AcademicActionResult,
} from "@/actions/academic.actions";
import { getAdminAnomalies, getAdminDashboardStats } from "@/lib/admin-domain";
import type {
  AcademicDataState,
  AdminCourseInput,
  AdminPromotionInput,
  AdminUserInput,
  AttendanceInput,
  MutationResult,
  TeacherSessionInput,
} from "@/types/admin";
import type {
  CheckInValidationResult,
  CorrectionRequestInput,
  CorrectionResolutionInput,
  StudentCheckInInput,
} from "@/types/student";
import type { AttendanceSource } from "@/types";
import { Button } from "@/components/ui/button";

const OBSOLETE_STORAGE_KEYS = [
  "presence-plus:academic-data:v3",
  "presence-plus:academic-data:v2",
  "presence-plus:admin-data:v1",
];

type AsyncResult = Promise<MutationResult>;

export interface AcademicDataContextValue {
  state: AcademicDataState;
  viewerId: string;
  hydrated: boolean;
  pending: boolean;
  isPending: (key?: string) => boolean;
  stats: ReturnType<typeof getAdminDashboardStats>;
  anomalies: ReturnType<typeof getAdminAnomalies>;
  createUser: (input: AdminUserInput) => AsyncResult;
  updateUser: (id: string, input: AdminUserInput) => AsyncResult;
  deleteUser: (id: string) => AsyncResult;
  setUserStatus: (id: string, status: "ACTIVE" | "INACTIVE") => AsyncResult;
  createPromotion: (input: AdminPromotionInput) => AsyncResult;
  updatePromotion: (id: string, input: AdminPromotionInput) => AsyncResult;
  deletePromotion: (id: string) => AsyncResult;
  createCourse: (input: AdminCourseInput) => AsyncResult;
  updateCourse: (id: string, input: AdminCourseInput) => AsyncResult;
  deleteCourse: (id: string) => AsyncResult;
  setCourseActive: (id: string, active: boolean) => AsyncResult;
  createSession: (input: TeacherSessionInput, teacherId: string) => Promise<MutationResult & { id?: string }>;
  updateSession: (id: string, input: TeacherSessionInput, teacherId: string) => AsyncResult;
  startSession: (id: string, teacherId: string) => AsyncResult;
  cancelSession: (id: string, reason?: string) => AsyncResult;
  completeSession: (id: string, teacherId: string) => AsyncResult;
  saveAttendance: (sessionId: string, input: AttendanceInput, teacherId: string) => AsyncResult;
  validateStudentCode: (raw: string, source: Extract<AttendanceSource, "QR" | "STUDENT_CODE">) => Promise<CheckInValidationResult>;
  submitStudentCheckIn: (input: StudentCheckInInput) => Promise<CheckInValidationResult>;
  createCorrectionRequest: (input: CorrectionRequestInput) => AsyncResult;
  cancelCorrectionRequest: (id: string, studentId: string) => AsyncResult;
  resolveCorrectionRequest: (input: CorrectionResolutionInput) => AsyncResult;
  resetData: () => Promise<void>;
  notify: (message: string) => void;
}

const AcademicDataContext = createContext<AcademicDataContextValue | null>(null);

export function AdminDataProvider({ children, initialState, viewerId }: { children: React.ReactNode; initialState?: AcademicDataState; viewerId: string }) {
  const [state, setState] = useState<AcademicDataState>(() => initialState ?? { version: 3, users: [], promotions: [], courses: [], sessions: [], attendances: [], correctionRequests: [], auditLogs: [] });
  const [hydrated, setHydrated] = useState(Boolean(initialState));
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const reduceMotion = useReducedMotion();

  const notify = useCallback((message: string) => setToast(message), []);

  const reload = useCallback(async (announce = false) => {
    setPendingCount((count) => count + 1);
    try {
      const data = await loadAcademicDataAction();
      setState(data);
      setHydrated(true);
      if (announce) notify("Données rechargées depuis Neon.");
    } catch {
      setHydrated(true);
      notify("Neon est momentanément indisponible. Réessayez dans un instant.");
    } finally {
      setPendingCount((count) => Math.max(0, count - 1));
    }
  }, [notify]);

  useEffect(() => {
    OBSOLETE_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    const timeout = initialState ? undefined : window.setTimeout(() => void reload(), 0);
    return () => { if (timeout !== undefined) window.clearTimeout(timeout); };
  }, [initialState, reload]);

  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void reload();
    }
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, [reload]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const run = useCallback(async <T,>(request: Promise<AcademicActionResult<T>>, key = "mutation") => {
    setPendingCount((count) => count + 1);
    setPendingKeys((current) => [...current, key]);
    try {
      const result = await request;
      if (result.ok && result.patch) setState((current) => ({ ...current, ...result.patch }));
      if (result.ok) notify(result.message);
      return result;
    } catch {
      return { ok: false, message: "La mutation n’a pas pu être confirmée par Neon." } as AcademicActionResult<T>;
    } finally {
      setPendingCount((count) => Math.max(0, count - 1));
      setPendingKeys((current) => current.filter((item, index) => item !== key || index !== current.lastIndexOf(key)));
    }
  }, [notify]);

  const createUser = useCallback((input: AdminUserInput) => run(createUserAction(input), "user:create"), [run]);
  const updateUser = useCallback((id: string, input: AdminUserInput) => run(updateUserAction(id, input), `user:${id}:update`), [run]);
  const deleteUser = useCallback((id: string) => run(deleteUserAction(id), `user:${id}:delete`), [run]);
  const setUserStatus = useCallback((id: string, status: "ACTIVE" | "INACTIVE") => run(setUserStatusAction(id, status), `user:${id}:status`), [run]);
  const createPromotion = useCallback((input: AdminPromotionInput) => run(createPromotionAction(input)), [run]);
  const updatePromotion = useCallback((id: string, input: AdminPromotionInput) => run(updatePromotionAction(id, input)), [run]);
  const deletePromotion = useCallback((id: string) => run(deletePromotionAction(id)), [run]);
  const createCourse = useCallback((input: AdminCourseInput) => run(createCourseAction(input)), [run]);
  const updateCourse = useCallback((id: string, input: AdminCourseInput) => run(updateCourseAction(id, input)), [run]);
  const deleteCourse = useCallback((id: string) => run(deleteCourseAction(id)), [run]);
  const setCourseActive = useCallback((id: string, active: boolean) => run(setCourseActiveAction(id, active), `course:${id}:active`), [run]);
  const createSession = useCallback(async (input: TeacherSessionInput) => {
    const result = await run(createSessionAction(input), "session:create");
    return { ...result, id: result.value?.id };
  }, [run]);
  const updateSession = useCallback((id: string, input: TeacherSessionInput) => run(updateSessionAction(id, input), `session:${id}:update`), [run]);
  const startSession = useCallback((id: string) => run(startSessionAction(id), `session:${id}:start`), [run]);
  const cancelSession = useCallback((id: string, reason?: string) => run(cancelSessionAction(id, reason), `session:${id}:cancel`), [run]);
  const completeSession = useCallback((id: string) => run(completeSessionAction(id), `session:${id}:complete`), [run]);
  const saveAttendance = useCallback((sessionId: string, input: AttendanceInput) => run(saveAttendanceAction(sessionId, input), `attendance:${sessionId}:${input.studentId}`), [run]);
  const createCorrectionRequest = useCallback((input: CorrectionRequestInput) => run(createCorrectionRequestAction(input), `correction:${input.sessionId}:create`), [run]);
  const cancelCorrectionRequest = useCallback((id: string) => run(cancelCorrectionRequestAction(id), `correction:${id}:cancel`), [run]);
  const resolveCorrectionRequest = useCallback((input: CorrectionResolutionInput) => run(resolveCorrectionRequestAction(input), `correction:${input.requestId}:resolve`), [run]);

  const validateStudentCode = useCallback(async (raw: string, source: Extract<AttendanceSource, "QR" | "STUDENT_CODE">) => {
    setPendingCount((count) => count + 1);
    try {
      return await validateStudentCodeAction(raw, source);
    } finally {
      setPendingCount((count) => Math.max(0, count - 1));
    }
  }, []);

  const submitStudentCheckIn = useCallback(async (input: StudentCheckInInput) => {
    setPendingCount((count) => count + 1);
    try {
      const result = await confirmStudentCheckInAction(input);
      if (result.ok && result.patch) setState((current) => ({ ...current, ...result.patch }));
      if (result.ok) notify(result.alreadyRecorded ? "Votre présence était déjà enregistrée." : "Présence confirmée dans Neon.");
      return result;
    } finally {
      setPendingCount((count) => Math.max(0, count - 1));
    }
  }, [notify]);

  const value = useMemo<AcademicDataContextValue>(() => ({
    state,
    viewerId,
    hydrated,
    pending: pendingCount > 0,
    isPending: (key?: string) => key ? pendingKeys.includes(key) : pendingKeys.length > 0,
    stats: getAdminDashboardStats(state),
    anomalies: getAdminAnomalies(state),
    createUser,
    updateUser,
    deleteUser,
    setUserStatus,
    createPromotion,
    updatePromotion,
    deletePromotion,
    createCourse,
    updateCourse,
    deleteCourse,
    setCourseActive,
    createSession,
    updateSession,
    startSession,
    cancelSession,
    completeSession,
    saveAttendance,
    validateStudentCode,
    submitStudentCheckIn,
    createCorrectionRequest,
    cancelCorrectionRequest,
    resolveCorrectionRequest,
    resetData: () => reload(true),
    notify,
  }), [state, viewerId, hydrated, pendingCount, pendingKeys, createUser, updateUser, deleteUser, setUserStatus, createPromotion, updatePromotion, deletePromotion, createCourse, updateCourse, deleteCourse, setCourseActive, createSession, updateSession, startSession, cancelSession, completeSession, saveAttendance, validateStudentCode, submitStudentCheckIn, createCorrectionRequest, cancelCorrectionRequest, resolveCorrectionRequest, reload, notify]);

  return (
    <AcademicDataContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: 8 }} className="fixed bottom-4 right-4 z-[80] flex max-w-sm items-center gap-3 border bg-background px-4 py-3 shadow-lg" role="status">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span className="text-sm font-medium">{toast}</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setToast("")} aria-label="Fermer la notification"><X /></Button>
          </motion.div>
        )}
      </AnimatePresence>
      {(!hydrated || pendingCount > 0) && (
        <div className="pointer-events-none fixed bottom-4 left-4 z-[80] flex items-center gap-2 bg-foreground px-3 py-2 text-xs text-background">
          <RotateCcw className="size-3.5 animate-spin" />
          {!hydrated ? "Connexion à Neon" : "Synchronisation"}
        </div>
      )}
    </AcademicDataContext.Provider>
  );
}

export function useAdminData() {
  const context = useContext(AcademicDataContext);
  if (!context) throw new Error("useAdminData doit être utilisé dans AdminDataProvider.");
  return context;
}

export const AcademicDataProvider = AdminDataProvider;
export const useAcademicData = useAdminData;
