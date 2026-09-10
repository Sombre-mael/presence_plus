"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { AttendanceStatus } from "@/types";
import type { AttendanceCorrectionRequest } from "@/types/student";
import { useAcademicData } from "@/components/admin/admin-data-provider";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function CorrectionDecisionDialog({
  request,
  trigger,
}: {
  request: AttendanceCorrectionRequest;
  trigger?: React.ReactNode;
}) {
  const { state, viewerId: teacherId, resolveCorrectionRequest, isPending } = useAcademicData();
  const attendance = state.attendances.find((item) => item.sessionId === request.sessionId && item.studentId === request.studentId);
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [resolvedStatus, setResolvedStatus] = useState<AttendanceStatus>(request.requestedStatus);
  const [checkedInAt, setCheckedInAt] = useState(attendance?.checkedInAt ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const pending = isPending(`correction:${request.id}:resolve`);
  function changeOpen(next: boolean) {
    if (pending) return;
    if (next) {
      setDecision("APPROVE");
      setResolvedStatus(request.requestedStatus);
      setCheckedInAt(attendance?.checkedInAt ?? "");
      setReason("");
      setError("");
    }
    setOpen(next);
  }

  async function submit() {
    const result = await resolveCorrectionRequest({
      requestId: request.id,
      teacherId,
      decision,
      reason,
      resolvedStatus: decision === "APPROVE" ? resolvedStatus : undefined,
      checkedInAt: decision === "APPROVE" && ["PRESENT", "LATE"].includes(resolvedStatus) ? checkedInAt : undefined,
    });
    if (result.ok) {
      setOpen(false);
      setError("");
    } else {
      setError(Object.values(result.fieldErrors ?? {})[0] ?? result.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>{trigger ?? <Button>Examiner</Button>}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Traiter la demande</DialogTitle>
          <DialogDescription>
            Une acceptation applique le statut retenu. Un refus conserve la présence actuelle.
          </DialogDescription>
        </DialogHeader>
        <fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
          <div className="flex flex-wrap gap-4 border-b pb-3 sm:col-span-2">
            <div><p className="mb-1 text-xs text-muted-foreground">Statut actuel</p>{attendance ? <StatusBadge status={attendance.status} /> : <span className="text-sm">À vérifier</span>}</div>
            <div><p className="mb-1 text-xs text-muted-foreground">Statut demandé</p><StatusBadge status={request.requestedStatus} /></div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Décision</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={decision === "APPROVE" ? "default" : "outline"} onClick={() => setDecision("APPROVE")}>
                <Check /> Accepter
              </Button>
              <Button type="button" variant={decision === "REJECT" ? "destructive" : "outline"} onClick={() => setDecision("REJECT")}>
                <X /> Refuser
              </Button>
            </div>
          </div>
          {decision === "APPROVE" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="correction-status">Statut retenu</Label>
                <Select value={resolvedStatus} onValueChange={(value) => setResolvedStatus(value as AttendanceStatus)}>
                  <SelectTrigger id="correction-status" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRESENT">Présent</SelectItem>
                    <SelectItem value="LATE">En retard</SelectItem>
                    <SelectItem value="ABSENT">Absent</SelectItem>
                    <SelectItem value="EXCUSED">Absence justifiée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="correction-time">Heure de pointage (si connue)</Label>
                <Input id="correction-time" type="time" value={checkedInAt} onChange={(event) => setCheckedInAt(event.target.value)} disabled={!['PRESENT', 'LATE'].includes(resolvedStatus)} />
              </div>
            </>
          ) : null}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="correction-reason">Motif de la décision</Label>
            <Textarea id="correction-reason" value={reason} onChange={(event) => { setReason(event.target.value); setError(""); }} placeholder="Expliquez votre décision…" aria-invalid={Boolean(error)} aria-describedby={error ? "correction-error" : undefined} />
            <p className="text-xs text-muted-foreground">5 caractères minimum</p>
          </div>
          {error ? <p id="correction-error" role="alert" className="sm:col-span-2 text-xs text-destructive">{error}</p> : null}
        </fieldset>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline" disabled={pending}>Plus tard</Button></DialogClose>
          <Button onClick={submit} disabled={pending || reason.trim().length < 5}>{pending ? "Enregistrement…" : "Enregistrer la décision"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
