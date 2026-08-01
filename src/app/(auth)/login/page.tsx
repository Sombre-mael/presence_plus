import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { LoginVisual } from "@/components/auth/login-visual";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const loginErrors: Record<string, string> = {
  database: "Neon est momentanement inaccessible. Verifiez votre connexion puis reessayez.",
  inactive: "Ce profil de demonstration est introuvable ou inactif.",
  profile: "Le profil demande n'est pas autorise en mode demonstration.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-screen bg-[#f6f8f7] lg:grid-cols-[minmax(420px,0.92fr)_minmax(520px,1.08fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#12332c] px-10 py-8 text-white lg:flex lg:flex-col xl:px-14 xl:py-10">
        <Link href="/" className="flex w-fit items-center gap-3 font-semibold">
          <span className="flex size-10 items-center justify-center bg-white">
            <Image src="/logo.svg" alt="" width={30} height={30} priority />
          </span>
          Presence Plus
        </Link>

        <div className="my-auto py-12">
          <p className="max-w-lg text-4xl font-semibold leading-tight tracking-normal xl:text-5xl">
            La présence devient plus simple à suivre.
          </p>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/70">
            Retrouvez votre espace et poursuivez un parcours clair, de la session jusqu’au suivi.
          </p>
          <div className="mt-10">
            <LoginVisual />
          </div>
        </div>

        <p className="text-xs text-white/55">Suivi académique centralisé</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-8 lg:px-12">
        <div className="w-full max-w-[460px]">
          <div className="mb-8 flex items-center justify-between lg:block">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Retour à l’accueil
            </Link>
            <Link href="/" className="flex items-center gap-2 font-semibold lg:hidden" aria-label="Presence Plus, accueil">
              <Image src="/logo.svg" alt="" width={30} height={30} priority />
              <span className="hidden sm:inline">Presence Plus</span>
            </Link>
          </div>

          <div className="mb-6 lg:hidden">
            <p className="text-xs font-semibold uppercase text-primary">Votre espace</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-normal">
              Reprenez votre suivi là où vous l’avez laissé.
            </h1>
          </div>

          <Card className="border-border/80 bg-background shadow-sm">
            <CardHeader className="space-y-2 pb-5">
              <p className="text-xs font-semibold uppercase text-primary">Accès de démonstration</p>
              <CardTitle className="text-2xl tracking-normal">Choisissez votre espace</CardTitle>
              <CardDescription>
                Testez les parcours avec l’un des trois profils reliés à Neon.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm error={error ? loginErrors[error] : undefined} />
            </CardContent>
          </Card>

          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            Aucun mot de passe n’est demandé tant que l’authentification réelle n’est pas activée.
          </p>
        </div>
      </section>
    </main>
  );
}
