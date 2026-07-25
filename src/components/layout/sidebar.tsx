"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  GraduationCap,
  History,
  LayoutDashboard,
  QrCode,
  School,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";
import { SheetClose } from "@/components/ui/sheet";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const roleLabels: Record<Role, string> = {
  ADMIN: "Administration",
  TEACHER: "Espace enseignant",
  STUDENT: "Espace étudiant",
};

const navigation: Record<Role, NavItem[]> = {
  ADMIN: [
    { href: "/admin/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/admin/users", label: "Utilisateurs", icon: Users },
    { href: "/admin/promotions", label: "Promotions", icon: GraduationCap },
    { href: "/admin/courses", label: "Cours", icon: BookOpen },
    { href: "/admin/statistics", label: "Statistiques", icon: BarChart3 },
  ],
  TEACHER: [
    { href: "/teacher/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/teacher/sessions", label: "Mes sessions", icon: CalendarCheck },
    { href: "/teacher/sessions/new", label: "Nouvelle session", icon: QrCode },
  ],
  STUDENT: [
    { href: "/student/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/student/check-in", label: "Pointer ma présence", icon: ClipboardCheck },
    { href: "/student/history", label: "Mon historique", icon: History },
  ],
};

interface SidebarProps {
  role: Role;
  mobile?: boolean;
}

export function Sidebar({ role, mobile = false }: SidebarProps) {
  const pathname = usePathname();

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <Image src="/logo.svg" alt="" width={34} height={34} priority />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Presence Plus</p>
          <p className="truncate text-xs text-muted-foreground">{roleLabels[role]}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navigation[role].map((item) => {
          const active =
            pathname === item.href ||
            (item.href.endsWith("/sessions") && pathname.startsWith(`${item.href}/`) && !pathname.endsWith("/new"));
          const link = (
            <Link
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                active && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );

          return mobile ? (
            <SheetClose asChild key={item.href}>{link}</SheetClose>
          ) : (
            <div key={item.href}>{link}</div>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center gap-3 rounded-md bg-muted/60 p-3">
          <School className="size-4 text-primary" />
          <div>
            <p className="text-xs font-medium">Année académique</p>
            <p className="text-xs text-muted-foreground">2025-2026</p>
          </div>
        </div>
      </div>
    </div>
  );

  return content;
}
