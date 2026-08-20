"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeCallbackUrl } from "@/lib/auth-navigation";

export function LoginForm({ callbackUrl, message }: { callbackUrl?: string; message?: string }) {
  const router = useRouter();
  const identifierRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();

  function submit(formData: FormData) {
    const identifier = String(formData.get("identifier") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    if (!identifier || !password) {
      setError("Renseignez votre identifiant et votre mot de passe.");
      identifierRef.current?.focus();
      return;
    }
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await signIn("credentials", { identifier, password, redirect: false });
        if (!result?.ok) {
          setError("Identifiant ou mot de passe incorrect. Vérifiez vos informations puis réessayez.");
          identifierRef.current?.focus();
          return;
        }
        router.replace(safeCallbackUrl(callbackUrl));
      } catch {
        setError("Le service de connexion est momentanément indisponible. Réessayez dans un instant.");
        identifierRef.current?.focus();
      }
    });
  }

  return (
    <motion.form
      action={submit}
      className="space-y-4"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div aria-live="polite">
        {message ? <Alert className="border-emerald-200 bg-emerald-50"><AlertTitle>Opération terminée</AlertTitle><AlertDescription>{message}</AlertDescription></Alert> : null}
        {error ? <Alert id="login-error" variant="destructive"><AlertTitle>Connexion impossible</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="identifier">E-mail ou matricule</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input ref={identifierRef} id="identifier" name="identifier" autoComplete="username" aria-invalid={Boolean(error)} aria-describedby={error ? "login-error" : undefined} className="h-11 pl-10" placeholder="prenom@etablissement.cd ou INF25-001" disabled={pending} />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password">Mot de passe</Label>
          <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">Mot de passe oublié ?</Link>
        </div>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" aria-invalid={Boolean(error)} aria-describedby={error ? "login-error" : undefined} className="h-11 px-10" disabled={pending} />
          <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 size-11" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
            {showPassword ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      </div>
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? <><LoaderCircle className="animate-spin" />Vérification...</> : "Se connecter"}
      </Button>
      <div className="space-y-3 border-t pt-4 text-center">
        <p className="text-xs leading-5 text-muted-foreground">Première connexion ? Ouvrez le lien personnel remis par votre établissement. Le code reste disponible en secours.</p>
        <Button type="button" variant="outline" className="h-11 w-full" asChild>
          <Link href="/activate-account"><KeyRound />Activer avec un code</Link>
        </Button>
      </div>
      <p className="text-center text-xs leading-5 text-muted-foreground">L’accès est créé par votre établissement. Il n’y a pas d’inscription publique.</p>
    </motion.form>
  );
}
