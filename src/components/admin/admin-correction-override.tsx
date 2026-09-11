"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { overrideCorrectionRequestAction } from "@/actions/admin-correction.actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AttendanceStatus } from "@/types";
import type { AdminCorrectionRow } from "@/types/admin-attendance";

export function AdminCorrectionOverride({ request }: { request: AdminCorrectionRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [resolvedStatus, setResolvedStatus] = useState<AttendanceStatus>(request.requestedStatus);
  const [checkedInAt, setCheckedInAt] = useState("08:00");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    setError("");
    startTransition(async () => {
      const result = await overrideCorrectionRequestAction({ requestId: request.id, decision, resolvedStatus: decision === "APPROVE" ? resolvedStatus : undefined, checkedInAt: decision === "APPROVE" ? checkedInAt : undefined, reason, currentPassword: password });
      if (!result.ok) { setError(result.message); return; }
      setOpen(false);
      router.refresh();
    });
  }

  return <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}><DialogTrigger asChild><Button size="sm" variant="outline"><ShieldCheck />Décision exceptionnelle</Button></DialogTrigger><DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Traiter la demande</DialogTitle><DialogDescription>Cette action administrative est exceptionnelle, confirmée par mot de passe et inscrite dans le journal d’activité.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={`decision-${request.id}`}>Décision</Label><Select value={decision} onValueChange={(value) => setDecision(value as "APPROVE" | "REJECT")}><SelectTrigger id={`decision-${request.id}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="APPROVE">Accepter et appliquer</SelectItem><SelectItem value="REJECT">Refuser</SelectItem></SelectContent></Select></div>{decision === "APPROVE" ? <><div className="space-y-2"><Label htmlFor={`status-${request.id}`}>Statut final</Label><Select value={resolvedStatus} onValueChange={(value) => setResolvedStatus(value as AttendanceStatus)}><SelectTrigger id={`status-${request.id}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PRESENT">Présent</SelectItem><SelectItem value="LATE">En retard</SelectItem><SelectItem value="ABSENT">Absent</SelectItem><SelectItem value="EXCUSED">Absence justifiée</SelectItem></SelectContent></Select></div>{["PRESENT", "LATE"].includes(resolvedStatus) ? <div className="space-y-2 sm:col-span-2"><Label htmlFor={`time-${request.id}`}>Heure de présence</Label><Input id={`time-${request.id}`} type="time" value={checkedInAt} onChange={(event) => setCheckedInAt(event.target.value)} /></div> : null}</> : null}<div className="space-y-2 sm:col-span-2"><Label htmlFor={`reason-${request.id}`}>Motif de la décision</Label><Textarea id={`reason-${request.id}`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Expliquez la vérification effectuée" /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor={`password-${request.id}`}>Votre mot de passe actuel</Label><Input id={`password-${request.id}`} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div>{error ? <Alert variant="destructive" className="sm:col-span-2"><AlertDescription>{error}</AlertDescription></Alert> : null}</div><DialogFooter><Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>Annuler</Button><Button disabled={pending || reason.trim().length < 5 || !password} onClick={submit}>{pending ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}{pending ? "Confirmation..." : "Confirmer"}</Button></DialogFooter></DialogContent></Dialog>;
}
