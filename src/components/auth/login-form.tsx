"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const demoRoles = [
  { href: "/admin/dashboard", label: "Administrateur", icon: ShieldCheck },
  { href: "/teacher/dashboard", label: "Enseignant", icon: UsersRound },
  { href: "/student/dashboard", label: "Étudiant", icon: UserRound },
];

export function LoginForm() {
  const [message, setMessage] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-5">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(true);
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Adresse e-mail</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="prenom@etablissement.cd" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pr-11"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full">
          <LockKeyhole />
          Se connecter
        </Button>
      </form>

      <AnimatePresence initial={false}>
        {message && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
          >
            <Alert>
              <AlertTitle>Mode démonstration</AlertTitle>
              <AlertDescription>Choisissez un accès ci-dessous pour poursuivre.</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">Accès de démonstration</span>
        <Separator className="flex-1" />
      </div>

      <div className="grid gap-2">
        {demoRoles.map((role, index) => (
          <motion.div
            key={role.href}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : index * 0.06 }}
          >
            <Button
              variant="outline"
              asChild
              className="h-14 w-full justify-start gap-3 px-3 hover:border-primary/40 hover:bg-primary/5"
            >
              <Link href={role.href}>
                <span className="flex size-8 shrink-0 items-center justify-center bg-primary/8">
                  <role.icon className="size-4 text-primary" />
                </span>
                <span className="min-w-0 flex-1 text-left text-sm font-medium">{role.label}</span>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
