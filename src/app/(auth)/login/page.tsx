import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { LoginVisual } from "@/components/auth/login-visual";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthenticatedViewer } from "@/lib/authenticated-viewer";
import { roleHome, safeCallbackUrl } from "@/lib/auth-navigation";

export const dynamic = "force-dynamic";

const notices: Record<string, string> = {
  activated: "Votre compte est activé. Connectez-vous avec votre nouveau mot de passe.",
  reset: "Votre mot de passe a été modifié. Vous pouvez vous connecter.",
  changed: "Votre mot de passe a été modifié. Reconnectez-vous pour continuer.",
  signedout: "Vous êtes maintenant déconnecté.",
  revoked: "Votre session a été révoquée. Reconnectez-vous.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; notice?: string }> }) {
  const params = await searchParams;
  const viewer = await getAuthenticatedViewer();
  if (viewer) redirect(viewer.mustChangePassword ? "/change-password" : roleHome(viewer.role));
  return (
    <main className="grid min-h-screen bg-[#f6f8f7] lg:grid-cols-[minmax(420px,0.92fr)_minmax(520px,1.08fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#12332c] px-10 py-8 text-white lg:flex lg:flex-col xl:px-14 xl:py-10">
        <Link href="/" className="flex w-fit items-center gap-3 font-semibold"><span className="flex size-10 items-center justify-center bg-white"><Image src="/logo.svg" alt="" width={30} height={30} priority /></span>Presence Plus</Link>
        <div className="my-auto py-12"><p className="max-w-lg text-4xl font-semibold leading-tight tracking-normal xl:text-5xl">La présence devient plus simple à suivre.</p><p className="mt-4 max-w-md text-sm leading-6 text-white/70">Accédez à votre espace sécurisé et retrouvez les informations autorisées par votre rôle.</p><div className="mt-10"><LoginVisual /></div></div>
        <p className="text-xs text-white/55">Suivi académique centralisé</p>
      </section>
      <section className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-8 lg:px-12">
        <div className="w-full max-w-[460px]">
          <div className="mb-8 flex items-center justify-between lg:block"><Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4" />Retour à l’accueil</Link><Link href="/" className="flex items-center gap-2 font-semibold lg:hidden"><Image src="/logo.svg" alt="" width={30} height={30} priority /><span className="hidden sm:inline">Presence Plus</span></Link></div>
          <Card className="border-border/80 bg-background shadow-sm">
            <CardHeader className="space-y-2 pb-5"><p className="text-xs font-semibold uppercase text-primary">Accès sécurisé</p><CardTitle className="text-2xl tracking-normal"><h1>Bienvenue</h1></CardTitle><CardDescription>Utilisez l’e-mail fourni par votre établissement ou votre matricule étudiant.</CardDescription></CardHeader>
            <CardContent><LoginForm callbackUrl={safeCallbackUrl(params.callbackUrl)} message={params.notice ? notices[params.notice] : undefined} /></CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
