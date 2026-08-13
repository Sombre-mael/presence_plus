import type { Role } from "@/types";

const ROLE_HOMES: Record<Role, string> = {
  ADMIN: "/admin/dashboard",
  TEACHER: "/teacher/dashboard",
  STUDENT: "/student/dashboard",
};

export function roleHome(role: Role) {
  return ROLE_HOMES[role];
}

export function safeCallbackUrl(value: string | null | undefined, fallback = "/dashboard") {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
