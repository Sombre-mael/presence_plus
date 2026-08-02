"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, LogIn, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Dashboard rendering failed", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <section className="w-full max-w-lg border bg-background p-6 text-center shadow-sm sm:p-8">
        <span className="mx-auto flex size-12 items-center justify-center bg-red-50 text-red-600">
          <AlertTriangle className="size-5" />
        </span>
        <h1 className="mt-5 text-xl font-semibold">Impossible d’afficher cet espace</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Une erreur de chargement ou de configuration a interrompu cette page. Les opérations déjà confirmées par Neon restent enregistrées.
        </p>
        {error.digest && <p className="mt-3 font-mono text-xs text-muted-foreground">Référence {error.digest}</p>}
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={reset}><RotateCcw />Réessayer</Button>
          <Button asChild variant="outline"><Link href="/login"><LogIn />Changer de profil</Link></Button>
        </div>
      </section>
    </main>
  );
}
