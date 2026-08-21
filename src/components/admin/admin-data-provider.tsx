"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertCircle, CheckCircle2, CloudOff, RotateCcw, X } from "lucide-react";
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
  loadLiveAcademicDataAction,
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
import { resendInvitationAction, revokeUserSessionsAction, sendPasswordResetAction, type AuthActionResult } from "@/actions/auth.actions";
import { getAdminAnomalies, getAdminDashboardStats } from "@/lib/admin-domain";
import type {
  AcademicDataState,
  AdminCourseInput,
  AdminPromotionInput,
  AdminUserInput,
  AttendanceInput,
  MutationResult,
  TeacherSessionInput,
  UserAccessMutationValue,
} from "@/types/admin";
import type {
  CheckInValidationResult,
  CorrectionRequestInput,
  CorrectionResolutionInput,
  StudentCheckInInput,
} from "@/types/student";
import type { AdminLevel } from "@/types";
import type { AttendanceSource } from "@/types";
import { Button } from "@/components/ui/button";
import { canApplySyncResponse } from "@/lib/sync-domain";
import type { AuthAccessCredential } from "@/types/auth";

const OBSOLETE_STORAGE_KEYS = [
  "presence-plus:academic-data:v3",
  "presence-plus:academic-data:v2",
  "presence-plus:admin-data:v1",
];

type AsyncResult = Promise<MutationResult>;
type UserAccessResult = Promise<MutationResult & { value?: UserAccessMutationValue }>;

export interface AcademicDataContextValue {
  state: AcademicDataState;
  viewerId: string;
  viewerAdminLevel?: AdminLevel;
  hydrated: boolean;
  pending: boolean;
  isPending: (key?: string) => boolean;
  stats: ReturnType<typeof getAdminDashboardStats>;
  anomalies: ReturnType<typeof getAdminAnomalies>;
  createUser: (input: AdminUserInput) => UserAccessResult;
  updateUser: (id: string, input: AdminUserInput) => UserAccessResult;
  deleteUser: (id: string, currentPassword?: string) => AsyncResult;
  setUserStatus: (id: string, status: "ACTIVE" | "INACTIVE", currentPassword?: string) => UserAccessResult;
  resendInvitation: (id: string, currentPassword?: string) => Promise<AuthActionResult<AuthAccessCredential>>;
  sendPasswordReset: (id: string, currentPassword?: string) => Promise<AuthActionResult<AuthAccessCredential>>;
  revokeUserSessions: (id: string, currentPassword?: string) => AsyncResult;
  createPromotion: (input: AdminPromotionInput) => AsyncResult;
  updatePromotion: (id: string, input: AdminPromotionInput) => AsyncResult;
  deletePromotion: (id: string) => AsyncResult;
  createCourse: (input: AdminCourseInput) => AsyncResult;
  updateCourse: (id: string, input: AdminCourseInput) => AsyncResult;
  deleteCourse: (id: string) => AsyncResult;
  setCourseActive: (id: string, active: boolean) => AsyncResult;
  createSession: (input: TeacherSessionInput) => Promise<MutationResult & { id?: string }>;
  updateSession: (id: string, input: TeacherSessionInput) => AsyncResult;
  startSession: (id: string) => AsyncResult;
  cancelSession: (id: string, reason?: string) => AsyncResult;
  completeSession: (id: string) => AsyncResult;
  saveAttendance: (sessionId: string, input: AttendanceInput) => AsyncResult;
  validateStudentCode: (raw: string, source: Extract<AttendanceSource, "QR" | "STUDENT_CODE">) => Promise<CheckInValidationResult>;
  submitStudentCheckIn: (input: StudentCheckInInput) => Promise<CheckInValidationResult>;
  createCorrectionRequest: (input: CorrectionRequestInput) => AsyncResult;
  cancelCorrectionRequest: (id: string) => AsyncResult;
  resolveCorrectionRequest: (input: CorrectionResolutionInput) => AsyncResult;
  resetData: () => Promise<void>;
  notify: (message: string) => void;
  syncStatus: "synced" | "syncing" | "error";
  lastSyncedAt?: string;
}

const AcademicDataContext = createContext<AcademicDataContextValue | null>(null);

export function AdminDataProvider({ children, initialState, viewerId, viewerAdminLevel }: { children: React.ReactNode; initialState?: AcademicDataState; viewerId: string; viewerAdminLevel?: AdminLevel }) {
  const [state, setState] = useState<AcademicDataState>(() => initialState ?? { version: 3, users: [], promotions: [], courses: [], sessions: [], attendances: [], correctionRequests: [], auditLogs: [] });
  const [hydrated, setHydrated] = useState(Boolean(initialState));
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error">(initialState ? "synced" : "syncing");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>(initialState ? new Date().toISOString() : undefined);
  const reloadSequence = useRef(0);
  const mutationRevision = useRef(0);
  const reduceMotion = useReducedMotion();

  const notify = useCallback((message: string) => setToast({ message, type: "success" }), []);
  const notifyError = useCallback((message: string) => setToast({ message, type: "error" }), []);

  const reload = useCallback(async (announce = false) => {
    const sequence = ++reloadSequence.current;
    const revision = mutationRevision.current;
    setPendingCount((count) => count + 1);
    setSyncStatus("syncing");
    try {
      const result = await loadAcademicDataAction();
      if (!result.viewerId || !result.role || !result.state) {
        window.location.replace("/login");
        return;
      }
      if (result.viewerId !== viewerId) {
        const homes = { ADMIN: "/admin/dashboard", TEACHER: "/teacher/dashboard", STUDENT: "/student/dashboard" } as const;
        window.location.replace(homes[result.role]);
        return;
      }
      if (!canApplySyncResponse({
        requestSequence: sequence,
        latestSequence: reloadSequence.current,
        revisionAtStart: revision,
        currentRevision: mutationRevision.current,
        responseViewerId: result.viewerId,
        currentViewerId: viewerId,
      })) return;
      setState(result.state);
      setHydrated(true);
      setSyncStatus("synced");
      setLastSyncedAt(result.syncedAt);
      if (announce) notify("Données actualisées.");
    } catch {
      if (sequence !== reloadSequence.current) return;
      setHydrated(true);
      setSyncStatus("error");
      notifyError("Le service de données est momentanément indisponible. Réessayez dans un instant.");
    } finally {
      setPendingCount((count) => Math.max(0, count - 1));
    }
  }, [notify, notifyError, viewerId]);

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

  const hasActiveSession = state.sessions.some((session) => session.status === "ACTIVE");
  useEffect(() => {
    if (!hasActiveSession) return;
    const interval = window.setInterval(async () => {
      if (document.visibilityState !== "visible" || pendingKeys.length > 0) return;
      const sequence = ++reloadSequence.current;
      const revision = mutationRevision.current;
      try {
        const result = await loadLiveAcademicDataAction();
        if (!result.viewerId || !result.role || !result.patch) {
          window.location.replace("/login");
          return;
        }
        if (result.viewerId !== viewerId) {
          const homes = { ADMIN: "/admin/dashboard", TEACHER: "/teacher/dashboard", STUDENT: "/student/dashboard" } as const;
          window.location.replace(homes[result.role]);
          return;
        }
        if (!canApplySyncResponse({
          requestSequence: sequence,
          latestSequence: reloadSequence.current,
          revisionAtStart: revision,
          currentRevision: mutationRevision.current,
          responseViewerId: result.viewerId,
          currentViewerId: viewerId,
        })) return;
        setState((current) => ({ ...current, ...result.patch }));
        setSyncStatus("synced");
        setLastSyncedAt(result.syncedAt);
      } catch {
        if (sequence === reloadSequence.current) setSyncStatus("error");
      }
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [hasActiveSession, pendingKeys.length, viewerId]);

  useEffect(() => {
    if (!toast) return;
    if (toast.type === "error") return;
    const timeout = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const run = useCallback(async <T,>(request: Promise<AcademicActionResult<T>>, key = "mutation") => {
    setPendingCount((count) => count + 1);
    setPendingKeys((current) => [...current, key]);
    try {
      const result = await request;
      if (result.ok) mutationRevision.current += 1;
      if (result.ok && result.patch) setState((current) => ({ ...current, ...result.patch }));
      if (result.ok) {
        setSyncStatus("synced");
        setLastSyncedAt(new Date().toISOString());
      }
      if (result.ok) notify(result.message);
      else notifyError(result.message);
      return result;
    } catch {
      setSyncStatus("error");
      const result = { ok: false, message: "La modification n’a pas pu être confirmée." } as AcademicActionResult<T>;
      notifyError(result.message);
      return result;
    } finally {
      setPendingCount((count) => Math.max(0, count - 1));
      setPendingKeys((current) => current.filter((item, index) => item !== key || index !== current.lastIndexOf(key)));
    }
  }, [notify, notifyError]);

  const createUser = useCallback((input: AdminUserInput) => run(createUserAction(input), "user:create"), [run]);
  const updateUser = useCallback((id: string, input: AdminUserInput) => run(updateUserAction(id, input), `user:${id}:update`), [run]);
  const deleteUser = useCallback((id: string, currentPassword?: string) => run(deleteUserAction(id, currentPassword), `user:${id}:delete`), [run]);
  const setUserStatus = useCallback((id: string, status: "ACTIVE" | "INACTIVE", currentPassword?: string) => run(setUserStatusAction(id, status, currentPassword), `user:${id}:status`), [run]);
  const runAuth = useCallback(async <T,>(request: Promise<AuthActionResult<T>>, key: string) => {
    setPendingCount((count) => count + 1);
    setPendingKeys((current) => [...current, key]);
    try {
      const result = await request;
      if (result.ok) {
        notify(result.message);
        await reload();
      } else notifyError(result.message);
      return result;
    } catch {
      const result = { ok: false, message: "L’opération de sécurité n’a pas pu être confirmée." };
      notifyError(result.message);
      return result as AuthActionResult<T>;
    } finally {
      setPendingCount((count) => Math.max(0, count - 1));
      setPendingKeys((current) => current.filter((item) => item !== key));
    }
  }, [notify, notifyError, reload]);
  const resendInvitation = useCallback((id: string, currentPassword?: string) => runAuth(resendInvitationAction(id, currentPassword), `user:${id}:invite`), [runAuth]);
  const sendPasswordReset = useCallback((id: string, currentPassword?: string) => runAuth(sendPasswordResetAction(id, currentPassword), `user:${id}:reset-password`), [runAuth]);
  const revokeUserSessions = useCallback((id: string, currentPassword?: string) => runAuth(revokeUserSessionsAction(id, currentPassword), `user:${id}:revoke`), [runAuth]);
  const createPromotion = useCallback((input: AdminPromotionInput) => run(createPromotionAction(input), "promotion:create"), [run]);
  const updatePromotion = useCallback((id: string, input: AdminPromotionInput) => run(updatePromotionAction(id, input), `promotion:${id}:update`), [run]);
  const deletePromotion = useCallback((id: string) => run(deletePromotionAction(id), `promotion:${id}:delete`), [run]);
  const createCourse = useCallback((input: AdminCourseInput) => run(createCourseAction(input), "course:create"), [run]);
  const updateCourse = useCallback((id: string, input: AdminCourseInput) => run(updateCourseAction(id, input), `course:${id}:update`), [run]);
  const deleteCourse = useCallback((id: string) => run(deleteCourseAction(id), `course:${id}:delete`), [run]);
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
      const result = await validateStudentCodeAction(raw, source);
      if (result.ok) mutationRevision.current += 1;
      if (result.ok && result.patch) setState((current) => ({ ...current, ...result.patch }));
      return result;
    } catch {
      setSyncStatus("error");
      return {
        ok: false,
        code: "NETWORK_ERROR",
        message: "Impossible de vérifier le code. Vérifiez votre connexion puis réessayez.",
      } as const;
    } finally {
      setPendingCount((count) => Math.max(0, count - 1));
    }
  }, []);

  const submitStudentCheckIn = useCallback(async (input: StudentCheckInInput) => {
    setPendingCount((count) => count + 1);
    try {
      const result = await confirmStudentCheckInAction(input);
      if (result.ok) mutationRevision.current += 1;
      if (result.ok && result.patch) setState((current) => ({ ...current, ...result.patch }));
      if (result.ok) notify(result.alreadyRecorded ? "Votre présence était déjà enregistrée." : "Présence enregistrée avec succès.");
      return result;
    } catch {
      setSyncStatus("error");
      return {
        ok: false,
        code: "NETWORK_ERROR",
        message: "Le pointage n’a pas pu être confirmé. Votre présence n’a pas été modifiée; réessayez.",
      } as const;
    } finally {
      setPendingCount((count) => Math.max(0, count - 1));
    }
  }, [notify]);

  const value = useMemo<AcademicDataContextValue>(() => ({
    state,
    viewerId,
    viewerAdminLevel,
    hydrated,
    pending: pendingCount > 0,
    isPending: (key?: string) => key ? pendingKeys.includes(key) : pendingKeys.length > 0,
    stats: getAdminDashboardStats(state),
    anomalies: getAdminAnomalies(state),
    createUser,
    updateUser,
    deleteUser,
    setUserStatus,
    resendInvitation,
    sendPasswordReset,
    revokeUserSessions,
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
    syncStatus,
    lastSyncedAt,
  }), [state, viewerId, viewerAdminLevel, hydrated, pendingCount, pendingKeys, createUser, updateUser, deleteUser, setUserStatus, resendInvitation, sendPasswordReset, revokeUserSessions, createPromotion, updatePromotion, deletePromotion, createCourse, updateCourse, deleteCourse, setCourseActive, createSession, updateSession, startSession, cancelSession, completeSession, saveAttendance, validateStudentCode, submitStudentCheckIn, createCorrectionRequest, cancelCorrectionRequest, resolveCorrectionRequest, reload, notify, syncStatus, lastSyncedAt]);

  return (
    <AcademicDataContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: 8 }} className="fixed bottom-4 right-4 z-[80] flex max-w-sm items-center gap-3 border bg-background px-4 py-3 shadow-lg" role="status">
            {toast.type === "success" ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" /> : <AlertCircle className="size-4 shrink-0 text-red-600" />}
            <span className="text-sm font-medium">{toast.message}</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setToast(null)} aria-label="Fermer la notification"><X /></Button>
          </motion.div>
        )}
      </AnimatePresence>
      {(!hydrated || pendingCount > 0) && (
        <div className="pointer-events-none fixed bottom-4 left-4 z-[80] flex items-center gap-2 bg-foreground px-3 py-2 text-xs text-background">
          <RotateCcw className="size-3.5 animate-spin" />
          {!hydrated ? "Chargement des données" : "Synchronisation"}
        </div>
      )}
      {hydrated && pendingCount === 0 && syncStatus === "error" && (
        <div className="fixed bottom-4 left-4 z-[80] flex max-w-[calc(100vw-2rem)] items-center gap-2 border border-red-200 bg-background px-3 py-2 text-xs text-red-700 shadow-lg" role="alert">
          <CloudOff className="size-4 shrink-0" />
          <span>Données affichées hors synchronisation.</span>
          <Button variant="outline" size="sm" onClick={() => void reload(true)}>Réessayer</Button>
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
