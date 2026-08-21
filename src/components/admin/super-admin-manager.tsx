"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, KeyRound, LoaderCircle, Shield, ShieldCheck } from "lucide-react";
import { updateAdminLevelAction } from "@/actions/super-admin.actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminLevel } from "@/types";
import type { SystemAdminSummary, SystemAdministrationData } from "@/types/admin";

export function SuperAdminManager({ data, viewerId }: { data: SystemAdministrationData; viewerId: string }) {
  const router = useRouter();
  const [admins, setAdmins] = useState(data.admins);
  const [target, setTarget] = useState<{ admin: SystemAdminSummary; nextLevel: AdminLevel }>();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean }>();
  const [pending, startTransition] = useTransition();

  function confirm() {
    if (!target) return;
    setMessage(undefined);
    startTransition(async () => {
      const result = await updateAdminLevelAction(target.admin.id, target.nextLevel, password);
      setMessage({ text: result.message, error: !result.ok });
      if (!result.ok) return;
      setAdmins((current) => current.map((admin) => admin.id === target.admin.id ? { ...admin, adminLevel: target.nextLevel, activeSessionCount: 0 } : admin));
      setTarget(undefined);
      setPassword("");
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader title="Administration système" description="Supervisez les niveaux administrateur et les règles globales de sécurité." />
      <Alert className="mb-5 border-emerald-200 bg-emerald-50 text-emerald-950"><Crown /><AlertTitle>Accès super administrateur</AlertTitle><AlertDescription>Les opérations sensibles sont confirmées par votre mot de passe et consignées dans le journal d’activité.</AlertDescription></Alert>
      {message ? <Alert variant={message.error ? "destructive" : "default"} className="mb-4"><AlertDescription>{message.text}</AlertDescription></Alert> : null}
      <section className="border bg-background">
        <div className="border-b p-5"><h2 className="font-semibold">Administrateurs</h2><p className="mt-1 text-sm text-muted-foreground">Un super administrateur peut déléguer ce niveau, sans jamais supprimer la dernière protection active.</p></div>
        <div className="divide-y">
          {admins.map((admin) => (
            <div key={admin.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary">{admin.adminLevel === "SUPER" ? <Crown className="size-5" /> : <Shield className="size-5" />}</span>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{admin.name}</p>{admin.id === viewerId ? <Badge variant="outline">Vous</Badge> : null}<Badge variant={admin.adminLevel === "SUPER" ? "default" : "secondary"}>{admin.adminLevel === "SUPER" ? "Super administrateur" : "Administrateur"}</Badge></div><p className="mt-1 break-all text-sm text-muted-foreground">{admin.email}</p><p className="mt-1 text-xs text-muted-foreground">{admin.activeSessionCount} session{admin.activeSessionCount > 1 ? "s" : ""} active{admin.activeSessionCount > 1 ? "s" : ""}</p></div>
              <Button variant="outline" className="min-h-11" onClick={() => setTarget({ admin, nextLevel: admin.adminLevel === "SUPER" ? "STANDARD" : "SUPER" })}>{admin.adminLevel === "SUPER" ? <Shield /> : <ShieldCheck />}{admin.adminLevel === "SUPER" ? "Rétrograder" : "Promouvoir"}</Button>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-5 border bg-background p-5"><div className="flex gap-3"><KeyRound className="mt-0.5 size-5 text-primary" /><div><h2 className="font-semibold">Politique de photo</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Le pointage étudiant exigera une photo approuvée à partir du {new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Lubumbashi" }).format(new Date(data.profilePhotoEnforcementAt))}.</p></div></div></section>
      <Dialog open={Boolean(target)} onOpenChange={(open) => !pending && !open && setTarget(undefined)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{target?.nextLevel === "SUPER" ? "Promouvoir ce compte ?" : "Rétrograder ce compte ?"}</DialogTitle><DialogDescription>Les sessions de {target?.admin.name} seront révoquées et le nouveau niveau prendra effet à la prochaine connexion.</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label htmlFor="super-admin-password">Votre mot de passe actuel</Label><Input id="super-admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div>
          {message?.error ? <Alert variant="destructive"><AlertDescription>{message.text}</AlertDescription></Alert> : null}
          <DialogFooter><Button variant="outline" disabled={pending} onClick={() => setTarget(undefined)}>Annuler</Button><Button disabled={pending || !password} onClick={confirm}>{pending ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}{pending ? "Confirmation..." : "Confirmer"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
