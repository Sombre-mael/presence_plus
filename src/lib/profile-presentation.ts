import type { AccountAvatarColor } from "@/types/account";

export const avatarColorClasses: Record<AccountAvatarColor, string> = {
  EMERALD: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  BLUE: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  AMBER: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  ROSE: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  SLATE: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
};

export const avatarSwatchClasses: Record<AccountAvatarColor, string> = {
  EMERALD: "bg-emerald-500",
  BLUE: "bg-blue-500",
  AMBER: "bg-amber-500",
  ROSE: "bg-rose-500",
  SLATE: "bg-slate-500",
};

export const avatarColorLabels: Record<AccountAvatarColor, string> = {
  EMERALD: "Vert",
  BLUE: "Bleu",
  AMBER: "Ambre",
  ROSE: "Rose",
  SLATE: "Gris",
};

export function profileDisplayName(name: string, preferredName?: string) {
  return preferredName?.trim() || name;
}

export function profileInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toLocaleUpperCase("fr");
}
