"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { AlertTriangle, Bell, ChevronDown, LogOut, RotateCcw } from "lucide-react";
import type { Role, UserSummary } from "@/types";
import type { AdminAnomaly } from "@/types/admin";
import { clearDemoViewerAction } from "@/actions/demo-session.actions";
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
  audit: "Journal d’activité",
  sessions: "Sessions",
  new: "Nouvelle session",
  edit: "Modifier",
  qr: "QR code",
  attendances: "Présences",
  corrections: "Demandes de correction",
  "check-in": "Pointage",
  history: "Historique",
  schedule: "Mon planning",
};

function getBreadcrumb(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.slice(1).map((segment, index) => ({
    label: labels[segment] ?? "Détail",
    href: `/${segments.slice(0, index + 2).join("/")}`,
  }));
}

export function Topbar({
  user,
  role,
  anomalies = [],
  onResetDemo,
}: {
  user: UserSummary;
  role: Role;
  anomalies?: AdminAnomaly[];
  onResetDemo?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, startLeaving] = useTransition();
  const breadcrumb = getBreadcrumb(pathname);
  const notificationHref = role === "ADMIN"
    ? "/admin/sessions"
    : role === "TEACHER"
      ? "/teacher/corrections"
      : "/student/history";
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{breadcrumb.at(-1)?.label ?? "Presence Plus"}</p>
        <nav className="hidden truncate text-xs text-muted-foreground sm:flex" aria-label="Fil d'Ariane">
          <Link href={`/${role.toLowerCase()}/dashboard`} className="hover:text-foreground">Presence Plus</Link>
          {breadcrumb.map((item, index) => (
            <span key={item.href} className="min-w-0 truncate">
              <span aria-hidden="true"> / </span>
              {index === breadcrumb.length - 1
                ? <span aria-current="page">{item.label}</span>
                : <Link href={item.href} className="hover:text-foreground">{item.label}</Link>}
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`${anomalies.length} notifications`}>
              <Bell />
              {anomalies.length > 0 && (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500 ring-2 ring-background" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[min(360px,calc(100vw-2rem))]">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <span className="text-xs font-normal text-muted-foreground">{anomalies.length} à traiter</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {anomalies.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">Aucune notification.</div>
            ) : anomalies.slice(0, 4).map((anomaly) => (
              <DropdownMenuItem asChild key={anomaly.id} className="items-start gap-3 py-3">
                <Link href={anomaly.href}>
                  <AlertTriangle className={anomaly.severity === "HIGH" ? "text-red-600" : "text-amber-600"} />
                  <span>
                    <span className="block font-medium">{anomaly.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{anomaly.detail}</span>
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
            {anomalies.length > 4 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href={notificationHref}>Tout consulter</Link></DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
            {onResetDemo && (
              <DropdownMenuItem onSelect={onResetDemo}>
                <RotateCcw />
                Recharger depuis Neon
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              disabled={leaving}
              onSelect={() => startLeaving(async () => {
                await clearDemoViewerAction();
                router.push("/login");
                router.refresh();
              })}
            >
              <LogOut />
              {leaving ? "Fermeture..." : "Changer de profil"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
