import Link from "next/link";
import { cn } from "@/lib/utils";

export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Informations juridiques" className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground", className)}>
      <Link href="/legal/privacy" className="hover:text-foreground">Confidentialité</Link>
      <Link href="/legal/terms" className="hover:text-foreground">Conditions d’utilisation</Link>
      <Link href="/legal/cookies" className="hover:text-foreground">Cookies et mesure d’audience</Link>
    </nav>
  );
}
