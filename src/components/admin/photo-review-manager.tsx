"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { BadgeCheck, Camera, Check, Clock3, LoaderCircle, ShieldAlert, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { reviewProfilePhotoAction } from "@/actions/profile-photo.actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProfilePhotoReviewSummary } from "@/types/account";

const roleLabels = { ADMIN: "Administrateur", TEACHER: "Enseignant", STUDENT: "Étudiant" } as const;

export function PhotoReviewManager({ initialItems }: { initialItems: ProfilePhotoReviewSummary[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState(initialItems);
  const [showProcessed, setShowProcessed] = useState(false);
  const [rejecting, setRejecting] = useState<ProfilePhotoReviewSummary>();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean }>();
  const [pending, startTransition] = useTransition();
  const focusedId = searchParams.get("submission");
  const visible = useMemo(() => items
    .filter((item) => showProcessed ? item.status !== "PENDING" : item.status === "PENDING")
    .sort((a, b) => Number(b.id === focusedId) - Number(a.id === focusedId)), [focusedId, items, showProcessed]);

  function decide(item: ProfilePhotoReviewSummary, decision: "APPROVE" | "REJECT", reviewReason?: string) {
    setMessage(undefined);
    startTransition(async () => {
      const result = await reviewProfilePhotoAction(item.id, decision, reviewReason);
      setMessage({ text: result.message, error: !result.ok });
      if (!result.ok) return;
      setItems((current) => current.map((entry) => entry.id === item.id ? {
        ...entry,
        status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
        reviewReason: reviewReason?.trim(),
        reviewedAt: new Date().toISOString(),
      } : entry));
      setRejecting(undefined);
      setReason("");
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader title="Vérification des photos" description="Validez les photos utilisées pour identifier les comptes et autoriser le pointage étudiant." />
      <Alert className="mb-5 border-blue-200 bg-blue-50 text-blue-950">
        <Camera />
        <AlertTitle>Contrôle administratif, sans reconnaissance faciale</AlertTitle>
        <AlertDescription>Vérifiez un visage net et récent, une seule personne, et refusez les avatars, dessins, captures d’écran ou images artificielles.</AlertDescription>
      </Alert>
      <div className="mb-4 flex flex-col gap-3 border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button variant={!showProcessed ? "default" : "outline"} onClick={() => setShowProcessed(false)}><Clock3 />En attente</Button>
          <Button variant={showProcessed ? "default" : "outline"} onClick={() => setShowProcessed(true)}><BadgeCheck />Traitées</Button>
        </div>
        <p className="text-sm text-muted-foreground">{visible.length} photo{visible.length > 1 ? "s" : ""}</p>
      </div>
      {message ? <Alert variant={message.error ? "destructive" : "default"} className="mb-4"><AlertDescription>{message.text}</AlertDescription></Alert> : null}
      <div className="divide-y border bg-background">
        {visible.map((item) => (
          <article key={item.id} className="grid gap-4 p-4 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center">
            <div className="relative aspect-square w-full overflow-hidden bg-muted sm:w-[120px]">
              <Image src={item.photoUrl} alt={`Photo soumise par ${item.userName}`} fill sizes="120px" className="object-cover" unoptimized />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="break-words font-semibold">{item.userName}</h2>
                <Badge variant="secondary">{roleLabels[item.userRole]}</Badge>
                <Badge variant={item.status === "APPROVED" ? "default" : item.status === "REJECTED" ? "destructive" : "outline"}>
                  {item.status === "PENDING" ? "En attente" : item.status === "APPROVED" ? "Approuvée" : "Refusée"}
                </Badge>
              </div>
              <p className="mt-1 break-all text-sm text-muted-foreground">{item.userEmail}</p>
              <p className="mt-2 text-xs text-muted-foreground">Soumise le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lubumbashi" }).format(new Date(item.submittedAt))}</p>
              {item.reviewReason ? <p className="mt-2 text-sm text-red-700">Motif : {item.reviewReason}</p> : null}
            </div>
            {item.status === "PENDING" ? (
              <div className="grid gap-2 sm:w-36">
                <Button disabled={pending} onClick={() => decide(item, "APPROVE")}><Check />Approuver</Button>
                <Button variant="outline" disabled={pending} onClick={() => setRejecting(item)}><X />Refuser</Button>
              </div>
            ) : null}
          </article>
        ))}
        {!visible.length ? (
          <div className="p-10 text-center text-sm text-muted-foreground"><ShieldAlert className="mx-auto mb-3 size-6" />Aucune photo dans cette vue.</div>
        ) : null}
      </div>
      <Dialog open={Boolean(rejecting)} onOpenChange={(open) => !pending && !open && setRejecting(undefined)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Refuser cette photo ?</DialogTitle><DialogDescription>Le motif sera communiqué à l’utilisateur afin qu’il puisse soumettre une photo adaptée.</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label htmlFor="photo-rejection-reason">Motif du refus</Label><Textarea id="photo-rejection-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={300} placeholder="Ex. Le visage n’est pas suffisamment visible." /></div>
          <DialogFooter><Button variant="outline" disabled={pending} onClick={() => setRejecting(undefined)}>Annuler</Button><Button variant="destructive" disabled={pending || reason.trim().length < 5} onClick={() => rejecting && decide(rejecting, "REJECT", reason)}>{pending ? <LoaderCircle className="animate-spin" /> : <X />}{pending ? "Enregistrement..." : "Confirmer le refus"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
