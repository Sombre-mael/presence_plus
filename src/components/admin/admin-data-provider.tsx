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
import type {
  AdminCourseInput,
  AdminDataState,
  AdminPromotionInput,
  AdminUserInput,
  MutationResult,
} from "@/types/admin";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "presence-plus:admin-data:v1";

interface AdminDataContextValue {
  state: AdminDataState;
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
  resetData: () => void;
  notify: (message: string) => void;
}

const AdminDataContext = createContext<AdminDataContextValue | null>(null);

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdminDataState>(() => freshAdminData());
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState("");
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (isStoredAdminData(parsed)) setState(parsed);
          else window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const notify = useCallback((message: string) => setToast(message), []);
  const commit = useCallback((update: (current: AdminDataState) => AdminDataState) => {
    setState((current) => {
      const next = update(current);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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

  const resetData = useCallback(() => {
    const next = freshAdminData();
    setState(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    notify("Données de démonstration restaurées.");
  }, [notify]);

  const value = useMemo<AdminDataContextValue>(() => ({
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
    resetData,
    notify,
  }), [
    state, hydrated, createUser, updateUser, deleteUser, createPromotion, updatePromotion,
    deletePromotion, createCourse, updateCourse, deleteCourse, resetData, notify,
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
