import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ClipboardCheck, Eye, History } from "lucide-react";
import { AnimatedWorkflow } from "@/components/home/animated-workflow";
import { Button } from "@/components/ui/button";

const benefits = [
  {
    title: "Moins de saisie manuelle",
    description: "Les présences rejoignent directement la bonne session.",
    icon: ClipboardCheck,
    iconClassName: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "Une visibilité immédiate",
    description: "L’avancement reste lisible pendant et après la séance.",
    icon: Eye,
    iconClassName: "bg-amber-50 text-amber-700",
  },
  {
    title: "Un historique centralisé",
    description: "Les informations restent organisées et faciles à retrouver.",
    icon: History,
    iconClassName: "bg-sky-50 text-sky-700",
  },
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Navigation principale">
          <Link href="/" className="flex items-center gap-3" aria-label="Presence Plus, accueil">
            <Image src="/logo.svg" alt="" width={36} height={36} priority />
            <span className="font-semibold">Presence Plus</span>
          </Link>
          <Button asChild>
            <Link href="/login">Se connecter <ArrowRight /></Link>
          </Button>
        </nav>
      </header>

      <section className="bg-[#f6f8f7]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-8 pt-10 text-center sm:px-6 sm:pb-10 sm:pt-14">
          <p className="text-sm font-medium text-primary">Le suivi de présence, enfin lisible.</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
            Presence Plus
          </h1>
          <p className="mt-4 max-w-2xl text-lg font-medium leading-7 text-foreground sm:text-xl">
            Suivez les présences académiques rapidement, clairement et au même endroit.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Une session est créée, les participations sont collectées, puis les résultats deviennent immédiatement disponibles sans ressaisie inutile.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/login">Se connecter <ArrowRight /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="bg-background">
              <a href="#workflow">Voir comment ça marche <ArrowDown /></a>
            </Button>
          </div>
        </div>

        <AnimatedWorkflow />
      </section>

      <section className="border-b bg-background" aria-labelledby="benefits-title">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">L’essentiel, sans détour</p>
              <h2 id="benefits-title" className="mt-2 text-2xl font-semibold tracking-normal">Un suivi plus simple du début à la fin.</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Presence Plus rassemble le parcours de présence dans une interface unique et compréhensible.
            </p>
          </div>
          <div className="grid border-y sm:grid-cols-3">
            {benefits.map((benefit, index) => (
              <div
                key={benefit.title}
                className={`flex gap-4 py-5 sm:px-5 ${index > 0 ? "border-t sm:border-l sm:border-t-0" : ""}`}
              >
                <span className={`flex size-9 shrink-0 items-center justify-center ${benefit.iconClassName}`}>
                  <benefit.icon className="size-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{benefit.title}</h3>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex min-h-16 max-w-6xl flex-col justify-center gap-1 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>Presence Plus · Suivi des présences académiques</span>
        <Link href="/login" className="font-medium text-foreground hover:text-primary">Accéder à la connexion</Link>
      </footer>
    </main>
  );
}
