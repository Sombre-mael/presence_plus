"use client";

import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import type { Role, UserSummary } from "@/types";
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

interface DashboardLayoutProps {
  children: ReactNode;
  role: Role;
  user: UserSummary;
}

export function DashboardLayout({ children, role, user }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-sidebar lg:block">
        <Sidebar role={role} />
      </aside>

      <div className="lg:pl-64">
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
          <Topbar user={user} />
        </div>

        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
