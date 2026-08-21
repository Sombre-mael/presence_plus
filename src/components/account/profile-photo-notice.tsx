import Link from "next/link";
import { BadgeCheck, Camera, Clock3, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { profilePhotoGraceDays } from "@/lib/profile-photo-domain";
import type { UserSummary } from "@/types";

export function ProfilePhotoNotice({ user }: { user: UserSummary }) {
  if (user.role !== "STUDENT" || user.profilePhotoStatus === "APPROVED" || !user.profilePhotoEnforcementAt) return null;
  const days = profilePhotoGraceDays(user.profilePhotoEnforcementAt);
  const required = Boolean(user.profilePhotoRequired);
  const pending = user.profilePhotoStatus === "PENDING";
  return (
    <Alert variant={required ? "destructive" : "default"} className="mb-4 sm:mb-6">
      {required ? <ShieldAlert /> : pending ? <Clock3 /> : <Camera />}
      <AlertTitle>{required ? "Photo requise pour le pointage" : pending ? "Photo en cours de vérification" : "Complétez votre profil"}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {required
            ? "Le pointage reste bloqué jusqu’à l’approbation de votre photo."
            : pending
              ? `L’administration examine votre photo. Le délai de grâce se termine dans ${days} jour${days > 1 ? "s" : ""}.`
              : `Soumettez une photo claire avant ${days} jour${days > 1 ? "s" : ""} pour conserver l’accès au pointage.`}
        </span>
        <Button asChild variant={required ? "outline" : "default"} className="min-h-11 shrink-0">
          <Link href="/account/profile">{pending ? <BadgeCheck /> : <Camera />}{pending ? "Suivre la vérification" : "Ajouter ma photo"}</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
