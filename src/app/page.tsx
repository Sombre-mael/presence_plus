import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, QrCode, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.svg" alt="Presence Plus" width={36} height={36} priority />
          <span className="font-semibold">Presence Plus</span>
        </Link>
        <Button asChild>
          <Link href="/login">Connexion <ArrowRight /></Link>
        </Button>
      </nav>

      <section className="border-y bg-muted/30">
        <div className="mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="mb-4 text-sm font-medium text-primary">Gestion des présences académiques</p>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
              Des présences fiables, sans ralentir le cours.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Une interface commune pour administrer les cours, ouvrir des sessions et permettre aux étudiants de pointer simplement.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login">Explorer la démonstration <ArrowRight /></Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/teacher/sessions/session-001/qr">Voir un QR code</Link>
              </Button>
            </div>
          </div>

          <div className="border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-xs text-muted-foreground">Session en cours</p>
                <p className="mt-1 font-semibold">Algorithmique avancée</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Active</span>
            </div>
            <div className="grid gap-3 py-5 sm:grid-cols-2">
              <div className="bg-muted/60 p-4">
                <p className="metric-number text-3xl font-semibold">36/48</p>
                <p className="mt-1 text-sm text-muted-foreground">étudiants présents</p>
              </div>
              <div className="bg-muted/60 p-4">
                <p className="metric-number text-3xl font-semibold">75%</p>
                <p className="mt-1 text-sm text-muted-foreground">taux actuel</p>
              </div>
            </div>
            <div className="space-y-3 border-t pt-4">
              {[
                [QrCode, "Pointage par code QR"],
                [ShieldCheck, "Espaces adaptés à chaque rôle"],
                [CheckCircle2, "Historique et exports centralisés"],
              ].map(([Icon, text]) => (
                <div key={text as string} className="flex items-center gap-3 text-sm">
                  <Icon className="size-4 text-primary" />
                  <span>{text as string}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex h-16 max-w-6xl items-center px-4 text-xs text-muted-foreground sm:px-6">
        Presence Plus · Version de démonstration
      </footer>
    </main>
  );
}
