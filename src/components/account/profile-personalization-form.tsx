"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Palette, RotateCcw, Save, UserRound } from "lucide-react";
import { updateOwnProfileAction } from "@/actions/profile.actions";
import { ProfileAvatarEditor } from "@/components/account/profile-avatar-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  avatarColorLabels,
  avatarSwatchClasses,
  profileDisplayName,
} from "@/lib/profile-presentation";
import { ACCOUNT_AVATAR_COLORS, type AccountPersonalization, type AccountPhotoState, type AccountProfileUpdateInput } from "@/types/account";
import type { Role } from "@/types";

function editableValues(value: AccountPersonalization): AccountProfileUpdateInput {
  return {
    preferredName: value.preferredName ?? "",
    phone: value.phone ?? "",
    avatarColor: value.avatarColor,
  };
}

export function ProfilePersonalizationForm({
  officialName,
  initialValue,
  initialPhotoState,
  role,
}: {
  officialName: string;
  initialValue: AccountPersonalization;
  initialPhotoState: AccountPhotoState;
  role: Role;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => editableValues(initialValue));
  const [values, setValues] = useState(() => editableValues(initialValue));
  const [avatarUrl, setAvatarUrl] = useState(initialValue.avatarUrl);
  const [photoState, setPhotoState] = useState(initialPhotoState);
  const [message, setMessage] = useState<{ text: string; error: boolean }>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const preferredNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const displayName = profileDisplayName(officialName, values.preferredName);
  const dirty = values.preferredName !== saved.preferredName
    || values.phone !== saved.phone
    || values.avatarColor !== saved.avatarColor;

  function update<Key extends keyof AccountProfileUpdateInput>(key: Key, value: AccountProfileUpdateInput[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
    setMessage(undefined);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    startTransition(async () => {
      const result = await updateOwnProfileAction(values);
      setFieldErrors(result.fieldErrors ?? {});
      setMessage({ text: result.message, error: !result.ok });
      if (!result.ok) {
        if (result.fieldErrors?.preferredName) preferredNameRef.current?.focus();
        else if (result.fieldErrors?.phone) phoneRef.current?.focus();
        return;
      }
      if (result.value) {
        const next = editableValues(result.value);
        setSaved(next);
        setValues(next);
      }
      router.refresh();
    });
  }

  function reset() {
    setValues(saved);
    setFieldErrors({});
    setMessage(undefined);
  }

  return (
    <section className="overflow-hidden border bg-background">
      <div className="flex items-start gap-3 border-b p-5 sm:px-6">
        <UserRound className="mt-0.5 size-5 text-primary" aria-hidden="true" />
        <div>
          <h2 className="font-semibold">Personnaliser mon profil</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Choisissez comment votre compte apparaît dans Presence Plus.</p>
        </div>
      </div>

      <form onSubmit={submit} className="grid items-start gap-6 p-5 sm:p-6 lg:grid-cols-[260px_1fr]">
        <div className="flex flex-col items-center border bg-muted/20 p-5 text-center">
          <ProfileAvatarEditor
            displayName={displayName}
            avatarColor={values.avatarColor}
            avatarUrl={avatarUrl}
            photoState={photoState}
            role={role}
            onAvatarChange={setAvatarUrl}
            onPhotoStateChange={setPhotoState}
          />
        </div>

        <div className="min-w-0 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="profile-preferred-name">Prénom d’usage</Label>
            <Input
              ref={preferredNameRef}
              id="profile-preferred-name"
              name="preferredName"
              value={values.preferredName}
              onChange={(event) => update("preferredName", event.target.value)}
              placeholder="Ex. Sarah"
              autoComplete="nickname"
              maxLength={60}
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.preferredName)}
              aria-describedby={fieldErrors.preferredName ? "profile-preferred-name-error" : "profile-preferred-name-help"}
            />
            <p id="profile-preferred-name-help" className="text-xs text-muted-foreground">Laissez vide pour utiliser votre nom officiel.</p>
            {fieldErrors.preferredName ? <p id="profile-preferred-name-error" className="text-xs text-destructive">{fieldErrors.preferredName}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-phone">Téléphone</Label>
            <Input
              ref={phoneRef}
              id="profile-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              value={values.phone}
              onChange={(event) => update("phone", event.target.value)}
              placeholder="Ex. +243 999 000 000"
              autoComplete="tel"
              maxLength={24}
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? "profile-phone-error" : "profile-phone-help"}
            />
            <p id="profile-phone-help" className="text-xs text-muted-foreground">Facultatif et visible uniquement dans votre espace personnel.</p>
            {fieldErrors.phone ? <p id="profile-phone-error" className="text-xs text-destructive">{fieldErrors.phone}</p> : null}
          </div>

          <fieldset className="space-y-3" disabled={pending}>
            <legend className="flex items-center gap-2 text-sm font-medium"><Palette className="size-4" />Couleur des initiales</legend>
            <div className="flex flex-wrap gap-3">
              {ACCOUNT_AVATAR_COLORS.map((color) => {
                const selected = values.avatarColor === color;
                return (
                  <label key={color} className="cursor-pointer">
                    <input
                      type="radio"
                      name="avatarColor"
                      value={color}
                      checked={selected}
                      onChange={() => update("avatarColor", color)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "flex size-11 items-center justify-center rounded-full border-2 border-background shadow-sm ring-offset-2 transition-transform hover:scale-105 peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                        avatarSwatchClasses[color],
                        selected && "ring-2 ring-foreground",
                      )}
                      title={avatarColorLabels[color]}
                    >
                      {selected ? <Check className="size-5 text-white" aria-hidden="true" /> : null}
                      <span className="sr-only">{avatarColorLabels[color]}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Utilisée lorsqu’aucune photo n’est disponible : {avatarColorLabels[values.avatarColor]}.</p>
          </fieldset>

          <div aria-live="polite">
            {message ? <Alert variant={message.error ? "destructive" : "default"}><AlertDescription>{message.text}</AlertDescription></Alert> : null}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={reset} disabled={pending || !dirty} className="min-h-11">
              <RotateCcw />Annuler
            </Button>
            <Button type="submit" disabled={pending || !dirty} className="min-h-11">
              {pending ? <LoaderCircle className="animate-spin" /> : <Save />}
              {pending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
