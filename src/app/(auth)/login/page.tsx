import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-muted/30 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="hidden border-r bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-3 font-semibold">
          <span className="flex size-10 items-center justify-center bg-white">
            <Image src="/logo.svg" alt="" width={30} height={30} />
          </span>
          Presence Plus
        </Link>
        <div className="max-w-md">
          <p className="text-3xl font-semibold leading-tight">Un seul espace pour suivre chaque présence.</p>
          <p className="mt-4 text-sm leading-6 text-primary-foreground/75">
            Cette version de démonstration permet d’explorer les parcours administrateur, enseignant et étudiant.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/70">Année académique 2025-2026</p>
      </section>

      <section className="flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Retour à l’accueil
          </Link>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Bienvenue</CardTitle>
              <CardDescription>Connectez-vous ou choisissez un compte de démonstration.</CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
