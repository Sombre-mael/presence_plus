"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, LogOut } from "lucide-react";
import type { UserSummary } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const labels: Record<string, string> = {
  admin: "Administration",
  teacher: "Enseignant",
  student: "Étudiant",
  dashboard: "Tableau de bord",
  users: "Utilisateurs",
  promotions: "Promotions",
  courses: "Cours",
  statistics: "Statistiques",
  sessions: "Sessions",
  new: "Nouvelle session",
  qr: "QR code",
  attendances: "Présences",
  "check-in": "Pointage",
  history: "Historique",
};

function getBreadcrumb(pathname: string) {
  return pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => !["admin", "teacher", "student"].includes(segment))
    .map((segment) => labels[segment] ?? (segment.startsWith("session-") ? "Détail" : segment));
}

export function Topbar({ user }: { user: UserSummary }) {
  const pathname = usePathname();
  const breadcrumb = getBreadcrumb(pathname);
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{breadcrumb.at(-1) ?? "Presence Plus"}</p>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">
          Presence Plus{breadcrumb.length ? ` / ${breadcrumb.join(" / ")}` : ""}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 px-2">
              <Avatar className="size-7">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-32 truncate sm:inline">{user.name}</span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block truncate">{user.name}</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/login">
                <LogOut />
                Quitter la démonstration
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
