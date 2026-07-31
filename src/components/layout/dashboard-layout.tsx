"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import type { Role, UserSummary } from "@/types";
import type { AdminAnomaly } from "@/types/admin";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { RouteTransition } from "./route-transition";

interface DashboardLayoutProps {
  children: ReactNode;
  role: Role;
  user: UserSummary;
  anomalies?: AdminAnomaly[];
  onResetDemo?: () => void;
}

export function DashboardLayout({ children, role, user, anomalies = [], onResetDemo }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setCollapsed(window.localStorage.getItem(`presence-plus:${role.toLocaleLowerCase()}-sidebar`) === "collapsed");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [role]);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(`presence-plus:${role.toLocaleLowerCase()}-sidebar`, next ? "collapsed" : "expanded");
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r bg-sidebar transition-[width] duration-200 lg:block ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <Sidebar role={role} collapsed={collapsed} onToggle={toggleSidebar} />
      </aside>

      <div className={`transition-[padding] duration-200 ${collapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <div className="sticky top-0 z-30 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur lg:px-8">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2 lg:hidden" aria-label="Ouvrir la navigation">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
                <SheetDescription>Menu principal de Presence Plus</SheetDescription>
              </SheetHeader>
              <Sidebar role={role} mobile />
            </SheetContent>
          </Sheet>
          <Topbar user={user} anomalies={anomalies} onResetDemo={onResetDemo} />
        </div>

        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">
          <RouteTransition>{children}</RouteTransition>
        </main>
      </div>
    </div>
  );
}
