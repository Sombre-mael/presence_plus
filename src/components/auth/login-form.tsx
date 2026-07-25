"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const demoRoles = [
  { href: "/admin/dashboard", label: "Administrateur", detail: "Gestion globale", icon: ShieldCheck },
  { href: "/teacher/dashboard", label: "Enseignant", detail: "Sessions et présences", icon: UsersRound },
  { href: "/student/dashboard", label: "Étudiant", detail: "Pointage et historique", icon: UserRound },
];

export function LoginForm() {
  const [message, setMessage] = useState(false);

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
          <Input id="email" type="email" placeholder="prenom@etablissement.cd" required />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <span className="text-xs text-muted-foreground">Auth.js à venir</span>
          </div>
          <Input id="password" type="password" placeholder="••••••••" required />
        </div>
        <Button type="submit" className="w-full">
          <LockKeyhole />
          Se connecter
        </Button>
      </form>

      {message && (
        <Alert>
          <AlertTitle>Connexion de démonstration</AlertTitle>
          <AlertDescription>Choisissez un rôle ci-dessous pour explorer l’application.</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">Accès rapides</span>
        <Separator className="flex-1" />
      </div>

      <div className="grid gap-2">
        {demoRoles.map((role) => (
          <Button key={role.href} variant="outline" asChild className="h-auto justify-start px-3 py-3">
            <Link href={role.href}>
              <role.icon className="size-4 text-primary" />
              <span className="min-w-0 flex-1 text-left">
                <span className="block font-medium">{role.label}</span>
                <span className="block text-xs font-normal text-muted-foreground">{role.detail}</span>
              </span>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
