"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { ComponentType } from "react";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";
import { SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    { href: "/admin/sessions", label: "Sessions", icon: CalendarCheck },
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
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ role, mobile = false, collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const content = (
    <div className="flex h-full flex-col">
      <div className={`flex h-16 items-center gap-3 border-b ${collapsed ? "justify-center px-3" : "px-5"}`}>
        <Image src="/logo.svg" alt="" width={34} height={34} priority />
        <div className={`min-w-0 ${collapsed ? "hidden" : ""}`}>
          <p className="truncate text-sm font-semibold">Presence Plus</p>
          <p className="truncate text-xs text-muted-foreground">{roleLabels[role]}</p>
        </div>
      </div>

      <TooltipProvider>
      <nav className="flex-1 space-y-1 p-3">
        {navigation[role].map((item) => {
          const active =
            pathname === item.href ||
            (item.href.endsWith("/sessions") && pathname.startsWith(`${item.href}/`) && !pathname.endsWith("/new"));
          const link = (
            <Link
              href={item.href}
              aria-label={collapsed ? item.label : undefined}
              className={cn(
                "relative flex h-10 items-center gap-3 overflow-hidden rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                active && "text-sidebar-accent-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              {active && (
                <motion.span
                  layoutId={`active-navigation-${role}`}
                  className="absolute inset-0 bg-sidebar-accent"
                  transition={{ duration: reduceMotion ? 0 : 0.2 }}
                />
              )}
              <item.icon className="relative z-10 size-4 shrink-0" />
              {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
            </Link>
          );

          return mobile ? (
            <SheetClose asChild key={item.href}>{link}</SheetClose>
          ) : collapsed ? (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ) : (
            <div key={item.href}>{link}</div>
          );
        })}
      </nav>
      </TooltipProvider>

      <div className="border-t p-4">
        {!collapsed && <div className="flex items-center gap-3 rounded-md bg-muted/60 p-3">
          <School className="size-4 text-primary" />
          <div>
            <p className="text-xs font-medium">Année académique</p>
            <p className="text-xs text-muted-foreground">2025-2026</p>
          </div>
        </div>}
        {onToggle && (
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            className={collapsed ? "mx-auto mt-1" : "mt-3 w-full justify-start"}
            onClick={onToggle}
            aria-label={collapsed ? "Déployer la navigation" : "Réduire la navigation"}
            title={collapsed ? "Déployer la navigation" : "Réduire la navigation"}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            {!collapsed && <span>Réduire</span>}
          </Button>
        )}
      </div>
    </div>
  );

  return content;
}
