"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export function BrandLoader({
  compact = false,
  label = "Chargement en cours",
}: {
  compact?: boolean;
  label?: string;
}) {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        compact ? "justify-start gap-3" : "min-h-screen flex-col gap-4 bg-background",
      )}
      role="status"
      aria-live="polite"
    >
      <div className={cn("relative flex items-center justify-center", compact ? "size-9" : "size-14")}>
        <motion.span
          className="absolute inset-0 border border-primary/35"
          animate={shouldReduceMotion ? undefined : { scale: [0.88, 1.18], opacity: [0.8, 0] }}
          transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: "easeOut" }}
        />
        <span className="relative flex size-full items-center justify-center bg-slate-950">
          <Image
            src="/logo.svg"
            alt=""
            width={compact ? 28 : 42}
            height={compact ? 28 : 42}
            priority
          />
        </span>
      </div>
      <div className={cn(compact ? "text-left" : "text-center")}>
        <p className={cn("font-semibold", compact ? "text-sm" : "text-base")}>Presence Plus</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
