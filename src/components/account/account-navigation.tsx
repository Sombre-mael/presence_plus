"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, KeyRound, UserRound } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/account/profile", label: "Profil", icon: UserRound },
  { href: "/account/security", label: "Sécurité", icon: KeyRound },
  { href: "/account/notifications", label: "Notifications", icon: BellRing },
];

export function AccountNavigation() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <nav aria-label="Navigation du compte" className="mb-6 border-b pb-4">
      <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-sm px-2 text-xs font-medium transition-colors sm:gap-2 sm:text-sm",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="account-navigation-active"
                  className="absolute inset-0 rounded-sm bg-background shadow-sm ring-1 ring-foreground/5"
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
              <Icon className="relative z-10 size-4 shrink-0" />
              <span className="relative z-10 truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
