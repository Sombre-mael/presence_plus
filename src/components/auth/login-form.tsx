"use client";

import { useState, useTransition } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, GraduationCap, LoaderCircle, ShieldCheck, UsersRound } from "lucide-react";
import { selectDemoViewerAction } from "@/actions/demo-session.actions";
import type { DemoViewerId } from "@/lib/demo-viewer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const demoProfiles = [
  { id: "u1", name: "Aline Kabeya", email: "aline@presence.plus", label: "Administration", detail: "Référentiels et supervision", icon: ShieldCheck, color: "bg-emerald-100 text-emerald-800" },
  { id: "u2", name: "Patrick Ilunga", email: "patrick@presence.plus", label: "Enseignant", detail: "Sessions et présences", icon: UsersRound, color: "bg-amber-100 text-amber-800" },
  { id: "u4", name: "Sarah Mbuyi", email: "sarah@presence.plus", label: "Étudiante", detail: "Planning et pointage", icon: GraduationCap, color: "bg-sky-100 text-sky-800" },
] satisfies Array<{ id: DemoViewerId; name: string; email: string; label: string; detail: string; icon: typeof ShieldCheck; color: string }>;

export function LoginForm({ error }: { error?: string }) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<DemoViewerId>();
  const reduceMotion = useReducedMotion();

  function choose(id: DemoViewerId) {
    setSelected(id);
    startTransition(() => selectDemoViewerAction(id));
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Connexion impossible</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Alert className="border-amber-200 bg-amber-50 text-amber-950">
        <AlertTitle>Mode de démonstration</AlertTitle>
        <AlertDescription>Choisissez un profil. Ce sélecteur temporaire sera remplacé par Auth.js.</AlertDescription>
      </Alert>
      <div className="grid gap-2">
        {demoProfiles.map((profile, index) => (
          <motion.div key={profile.id} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : index * 0.06 }}>
            <Button type="button" variant="outline" disabled={pending} onClick={() => choose(profile.id)} className="h-auto min-h-20 w-full justify-start gap-3 px-3 py-3 text-left hover:border-primary/40 hover:bg-primary/5">
              <span className={`flex size-10 shrink-0 items-center justify-center ${profile.color}`}><profile.icon className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{profile.name}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{profile.label} · {profile.detail}</span>
                <span className="mt-1 block truncate text-[11px] font-normal text-muted-foreground">{profile.email}</span>
              </span>
              {pending && selected === profile.id ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4 text-muted-foreground" />}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
