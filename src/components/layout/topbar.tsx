"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTransition } from "react";
import { BellRing, ChevronDown, KeyRound, LogOut, RotateCcw, UserRound } from "lucide-react";
import type { Role, UserSummary } from "@/types";
import type { AdminAnomaly } from "@/types/admin";
import { ProfileAvatar } from "@/components/account/profile-avatar";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { removePushSubscriptionAction } from "@/actions/notification.actions";
import { getBrowserPushSubscription } from "@/lib/web-push.client";
import { profileDisplayName } from "@/lib/profile-presentation";
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
  profile: "Mon profil",
  security: "Sécurité du compte",
  notifications: "Notifications",
  "photo-reviews": "Vérification des photos",
  system: "Administration système",
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
  onReloadData,
}: {
  user: UserSummary;
  role: Role;
  anomalies?: AdminAnomaly[];
  onReloadData?: () => void;
}) {
  const pathname = usePathname();
  const [leaving, startLeaving] = useTransition();
  const breadcrumb = getBreadcrumb(pathname);
  const displayName = profileDisplayName(user.name, user.preferredName);

  async function revokeCurrentDevicePush() {
    const subscription = await getBrowserPushSubscription();
    if (!subscription) return;
    const result = await removePushSubscriptionAction(subscription.endpoint);
    if (result.ok) await subscription.unsubscribe();
  }

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
        <NotificationCenter anomalies={anomalies} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 px-2">
              <ProfileAvatar
                name={displayName}
                avatarUrl={user.avatarUrl}
                avatarColor={user.avatarColor}
                className="size-7"
              />
              <span className="hidden max-w-32 truncate sm:inline">{displayName}</span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block truncate">{displayName}</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
              {user.role === "ADMIN" ? <span className="mt-1 block text-xs font-medium text-primary">{user.adminLevel === "SUPER" ? "Super administrateur" : "Administrateur"}</span> : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {onReloadData && (
              <DropdownMenuItem onSelect={onReloadData}>
                <RotateCcw />
                Actualiser les données
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href="/account/profile"><UserRound />Mon profil</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/security"><KeyRound />Sécurité du compte</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/notifications"><BellRing />Notifications</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={leaving}
              onSelect={() => startLeaving(async () => {
                try {
                  await revokeCurrentDevicePush();
                } finally {
                  await signOut({ callbackUrl: "/login?notice=signedout" });
                }
              })}
            >
              <LogOut />
              {leaving ? "Déconnexion..." : "Se déconnecter"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
