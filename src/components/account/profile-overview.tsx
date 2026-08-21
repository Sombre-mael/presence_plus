import {
  AtSign,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Clock3,
  GraduationCap,
  Hash,
  Info,
  School,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProfileAvatar } from "@/components/account/profile-avatar";
import { ProfilePersonalizationForm } from "@/components/account/profile-personalization-form";
import { profileDisplayName } from "@/lib/profile-presentation";
import type { AccountProfile } from "@/types/account";

const roleLabels = {
  ADMIN: "Administrateur",
  TEACHER: "Enseignant",
  STUDENT: "Étudiant",
} as const;

function formatDate(value?: string, includeTime = false) {
  if (!value) return "Non renseignée";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
    timeZone: "Africa/Lubumbashi",
  }).format(new Date(value));
}

function ProfileDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 gap-3 border-t px-4 py-4 sm:px-5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
      </div>
    </div>
  );
}

export function ProfileOverview({ profile }: { profile: AccountProfile }) {
  const displayName = profileDisplayName(profile.name, profile.preferredName);
  const roleLabel = profile.role === "ADMIN" && profile.adminLevel === "SUPER"
    ? "Super administrateur"
    : roleLabels[profile.role];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden border bg-background">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <ProfileAvatar
            name={displayName}
            avatarUrl={profile.avatarUrl}
            avatarColor={profile.avatarColor}
            className="size-16 text-lg"
            alt={profile.avatarUrl ? `Photo de profil de ${displayName}` : ""}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-xl font-semibold">{displayName}</h2>
              <Badge variant="secondary">{roleLabel}</Badge>
              <Badge variant={profile.status === "ACTIVE" ? "default" : "destructive"}>
                {profile.status === "ACTIVE" ? "Compte actif" : "Compte inactif"}
              </Badge>
            </div>
            {displayName !== profile.name ? <p className="mt-1 break-words text-sm text-muted-foreground">{profile.name}</p> : null}
            <p className="mt-1 break-all text-sm text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        <dl className="grid sm:grid-cols-2">
          <ProfileDetail icon={UserRound} label="Nom complet" value={profile.name} />
          <ProfileDetail icon={AtSign} label="Adresse e-mail" value={profile.email} />
          <ProfileDetail icon={ShieldCheck} label="Rôle" value={roleLabel} />
          <ProfileDetail icon={BadgeCheck} label="État du compte" value={profile.status === "ACTIVE" ? "Actif" : "Inactif"} />
        </dl>
      </section>

      <ProfilePersonalizationForm
        officialName={profile.name}
        initialValue={{
          preferredName: profile.preferredName,
          phone: profile.phone,
          avatarUrl: profile.avatarUrl,
          avatarColor: profile.avatarColor,
        }}
        initialPhotoState={profile.photo}
        role={profile.role}
      />

      {profile.role === "STUDENT" ? (
        <section className="overflow-hidden border bg-background">
          <div className="border-b p-5 sm:px-6">
            <h2 className="font-semibold">Parcours académique</h2>
            <p className="mt-1 text-sm text-muted-foreground">Informations de scolarité associées à votre compte.</p>
          </div>
          <dl className="grid sm:grid-cols-2">
            <ProfileDetail icon={Hash} label="Matricule" value={profile.matricule ?? "Non renseigné"} />
            <ProfileDetail icon={GraduationCap} label="Promotion" value={profile.promotion?.name ?? "Non affectée"} />
            <ProfileDetail icon={School} label="Département" value={profile.promotion?.department ?? "Non renseigné"} />
            <ProfileDetail icon={CalendarDays} label="Année académique" value={profile.promotion?.academicYear ?? "Non renseignée"} />
          </dl>
        </section>
      ) : null}

      {profile.role === "TEACHER" ? (
        <section className="overflow-hidden border bg-background">
          <div className="border-b p-5 sm:px-6">
            <h2 className="font-semibold">Cours affectés</h2>
            <p className="mt-1 text-sm text-muted-foreground">Cours actuellement associés à votre compte enseignant.</p>
          </div>
          {profile.courses.length ? (
            <div className="divide-y">
              {profile.courses.map((course) => (
                <div key={course.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-6">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <BookOpen className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium">{course.code} · {course.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{course.promotion} · {course.weeklyHours} h par semaine</p>
                  </div>
                  <Badge variant={course.active ? "default" : "outline"}>{course.active ? "Actif" : "Inactif"}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 p-5 text-sm text-muted-foreground sm:px-6">
              <BookOpen className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p>Aucun cours n’est actuellement affecté à ce compte.</p>
            </div>
          )}
        </section>
      ) : null}

      {profile.role === "ADMIN" ? (
        <section className="flex gap-3 border bg-background p-5 sm:p-6">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Accès administrateur</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {profile.adminLevel === "SUPER"
                ? "Ce compte supervise les administrateurs, les paramètres système et la sécurité globale de l’établissement."
                : "Ce compte gère les utilisateurs académiques, les référentiels et les vérifications de photos."}
            </p>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden border bg-background">
        <div className="border-b p-5 sm:px-6">
          <h2 className="font-semibold">Activité du compte</h2>
          <p className="mt-1 text-sm text-muted-foreground">Repères liés à la création et à l’utilisation de votre accès.</p>
        </div>
        <dl className="grid sm:grid-cols-3">
          <ProfileDetail icon={CalendarDays} label="Compte créé" value={formatDate(profile.createdAt)} />
          <ProfileDetail icon={BadgeCheck} label="Compte activé" value={formatDate(profile.activatedAt)} />
          <ProfileDetail icon={Clock3} label="Dernière connexion" value={formatDate(profile.lastLoginAt, true)} />
        </dl>
      </section>

      <aside className="flex gap-3 border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p className="leading-6">Votre identité, votre rôle et vos affectations sont gérés par l’administration afin de préserver la cohérence des données académiques.</p>
      </aside>
    </div>
  );
}
