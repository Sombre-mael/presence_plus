"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { AttendanceStatus } from "@/types";
import type { AttendanceCorrectionRequest } from "@/types/student";
import { useAcademicData } from "@/components/admin/admin-data-provider";
import { deriveAttendanceStatus } from "@/lib/academic-domain";
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
  const session = state.sessions.find((item) => item.id === request.sessionId);
  const attendance = state.attendances.find((item) => item.sessionId === request.sessionId && item.studentId === request.studentId);
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [resolvedStatus, setResolvedStatus] = useState<AttendanceStatus>(["PRESENT", "LATE"].includes(request.requestedStatus) ? "PRESENT" : request.requestedStatus);
  const [checkedInAt, setCheckedInAt] = useState(attendance?.checkedInAt ?? session?.startTime ?? "08:00");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const pending = isPending(`correction:${request.id}:resolve`);
  const calculatedPresenceStatus = session && ["PRESENT", "LATE"].includes(resolvedStatus)
    ? deriveAttendanceStatus(session.startTime, checkedInAt, session.lateThresholdMinutes ?? 10)
    : undefined;

  async function submit() {
    const result = await resolveCorrectionRequest({
      requestId: request.id,
      teacherId,
      decision,
      reason,
      resolvedStatus: decision === "APPROVE" ? resolvedStatus : undefined,
      checkedInAt,
    });
    if (result.ok) {
      setOpen(false);
      setError("");
    } else {
      setError(result.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button>Examiner</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Traiter la demande</DialogTitle>
          <DialogDescription>
            La décision modifiera réellement la présence et sera visible dans l’espace étudiant.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
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
                <Label>Résultat final</Label>
                <Select value={resolvedStatus} onValueChange={(value) => setResolvedStatus(value as AttendanceStatus)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRESENT">Présence selon l’heure</SelectItem>
                    <SelectItem value="ABSENT">Absent</SelectItem>
                    <SelectItem value="EXCUSED">Absence justifiée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Heure retenue</Label>
                <Input type="time" value={checkedInAt} onChange={(event) => setCheckedInAt(event.target.value)} disabled={!['PRESENT', 'LATE'].includes(resolvedStatus)} />
                {calculatedPresenceStatus && <p className="text-xs text-muted-foreground">Statut calculé : {calculatedPresenceStatus === "LATE" ? "En retard" : "Présent"}</p>}
              </div>
            </>
          ) : null}
          <div className="space-y-2 sm:col-span-2">
            <Label>Motif de la décision</Label>
            <Textarea value={reason} onChange={(event) => { setReason(event.target.value); setError(""); }} placeholder="Expliquez votre décision…" aria-invalid={Boolean(error)} />
            <p className="text-xs text-muted-foreground">5 caractères minimum</p>
          </div>
          {error ? <p className="sm:col-span-2 text-xs text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline" disabled={pending}>Plus tard</Button></DialogClose>
          <Button onClick={submit} disabled={pending || reason.trim().length < 5}>{pending ? "Enregistrement…" : "Enregistrer la décision"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
