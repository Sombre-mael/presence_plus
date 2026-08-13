"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { requestPasswordResetAction } from "@/actions/auth.actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  function submit(formData: FormData) {
    const identifier = String(formData.get("identifier") ?? "").trim();
    if (!identifier) return inputRef.current?.focus();
    startTransition(async () => setMessage((await requestPasswordResetAction(identifier)).message));
  }
  return <form action={submit} className="space-y-4"><div aria-live="polite">{message ? <Alert className="border-emerald-200 bg-emerald-50"><AlertDescription>{message}</AlertDescription></Alert> : null}</div><div className="space-y-2"><Label htmlFor="identifier">E-mail ou matricule</Label><Input ref={inputRef} id="identifier" name="identifier" autoComplete="username" className="h-11" disabled={pending} /></div><Button className="h-11 w-full" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" />Vérification...</> : "Recevoir un lien"}</Button><Button asChild variant="ghost" className="w-full"><Link href="/login">Retour à la connexion</Link></Button></form>;
}
