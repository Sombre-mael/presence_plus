"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { Area } from "react-easy-crop";
import { BadgeCheck, Camera, Clock3, ImagePlus, LoaderCircle, ShieldAlert, Trash2, Upload } from "lucide-react";
import { removeOwnAvatarAction, uploadOwnAvatarAction } from "@/actions/profile.actions";
import { ProfileAvatar } from "@/components/account/profile-avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createCroppedAvatar } from "@/lib/profile-avatar.client";
import { PROFILE_AVATAR_ACCEPTED_TYPES, validateAvatarSource } from "@/lib/profile-avatar-domain";
import type { AccountAvatarColor, AccountPhotoState } from "@/types/account";
import type { Role } from "@/types";

type Operation = "upload" | "remove";

const Cropper = dynamic(() => import("react-easy-crop"), { ssr: false });
const CROPPER_STYLE = {};
const CROPPER_CLASSES = {};
const CROPPER_MEDIA_PROPS = { alt: "" };
const CROPPER_CONTAINER_PROPS = { "aria-label": "Zone de recadrage de la photo" };

export function ProfileAvatarEditor({
  displayName,
  avatarColor,
  avatarUrl,
  photoState,
  role,
  onAvatarChange,
  onPhotoStateChange,
}: {
  displayName: string;
  avatarColor: AccountAvatarColor;
  avatarUrl?: string;
  photoState: AccountPhotoState;
  role: Role;
  onAvatarChange: (avatarUrl?: string) => void;
  onPhotoStateChange: (photoState: AccountPhotoState) => void;
}) {
  const router = useRouter();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string>();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area>();
  const [operation, setOperation] = useState<Operation>();
  const [message, setMessage] = useState<{ text: string; error: boolean }>();

  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  function clearSource() {
    setSourceUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return undefined;
    });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(undefined);
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const error = validateAvatarSource(file);
    if (error) {
      setMessage({ text: error, error: true });
      return;
    }

    clearSource();
    setSourceUrl(URL.createObjectURL(file));
    setMessage(undefined);
    setEditorOpen(true);
  }

  async function saveCrop() {
    if (!sourceUrl || !croppedArea) return;
    setOperation("upload");
    setMessage(undefined);
    try {
      const file = await createCroppedAvatar(sourceUrl, croppedArea);
      const formData = new FormData();
      formData.set("avatar", file);
      const result = await uploadOwnAvatarAction(formData);
      setMessage({ text: result.message, error: !result.ok });
      if (!result.ok) return;

      if (result.value?.photoState) onPhotoStateChange(result.value.photoState);
      setEditorOpen(false);
      clearSource();
      router.refresh();
    } catch {
      setMessage({ text: "La photo n’a pas pu être préparée. Essayez une autre image.", error: true });
    } finally {
      setOperation(undefined);
    }
  }

  async function removeAvatar() {
    setOperation("remove");
    setMessage(undefined);
    try {
      const result = await removeOwnAvatarAction();
      setMessage({ text: result.message, error: !result.ok });
      if (!result.ok) return;
      if (result.value?.photoState) onPhotoStateChange(result.value.photoState);
      if (!result.value?.photoState?.approvedPhotoUrl) onAvatarChange(undefined);
      setRemoveOpen(false);
      router.refresh();
    } catch {
      setMessage({ text: "La photo n’a pas pu être supprimée. Vérifiez votre connexion puis réessayez.", error: true });
    } finally {
      setOperation(undefined);
    }
  }

  const acceptedTypes = PROFILE_AVATAR_ACCEPTED_TYPES.join(",");

  return (
    <div className="flex w-full flex-col items-center text-center">
      <div className="relative">
        <ProfileAvatar
          name={displayName}
          avatarUrl={avatarUrl}
          avatarColor={avatarColor}
          className="size-24 text-2xl shadow-sm"
          alt={avatarUrl ? `Photo de profil de ${displayName}` : ""}
        />
        <Button
          type="button"
          size="icon-sm"
          className="absolute -right-1 -bottom-1 rounded-full shadow-sm"
          onClick={() => galleryInputRef.current?.click()}
          disabled={Boolean(operation)}
          title={avatarUrl ? "Changer la photo" : "Ajouter une photo"}
        >
          <Camera aria-hidden="true" />
          <span className="sr-only">{avatarUrl ? "Changer la photo" : "Ajouter une photo"}</span>
        </Button>
      </div>

      <p className="mt-4 max-w-full break-words font-semibold">{displayName}</p>
      <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG ou WebP · 8 Mo maximum</p>

      <div className="mt-3 w-full">
        {photoState.status === "APPROVED" ? (
          <p className="flex items-center justify-center gap-2 text-xs font-medium text-emerald-700"><BadgeCheck className="size-4" />Photo vérifiée</p>
        ) : photoState.status === "PENDING" ? (
          <p className="flex items-center justify-center gap-2 text-xs font-medium text-amber-700"><Clock3 className="size-4" />Vérification en cours</p>
        ) : photoState.status === "REJECTED" ? (
          <Alert variant="destructive"><ShieldAlert className="size-4" /><AlertDescription>{photoState.reviewReason ?? "La photo doit être remplacée."}</AlertDescription></Alert>
        ) : (
          <p className="text-xs text-muted-foreground">Photo non vérifiée</p>
        )}
      </div>

      <div className="mt-4 grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <Button type="button" className="min-h-11" onClick={() => cameraInputRef.current?.click()} disabled={Boolean(operation)}>
          <Camera />Prendre une photo
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => galleryInputRef.current?.click()} disabled={Boolean(operation)}>
          <ImagePlus />Importer
        </Button>
        {avatarUrl && !(role === "STUDENT" && photoState.status === "APPROVED") ? (
          <Button type="button" variant="ghost" className="min-h-11 text-destructive hover:text-destructive sm:col-span-2 lg:col-span-1" onClick={() => setRemoveOpen(true)} disabled={Boolean(operation)}>
            <Trash2 />Supprimer
          </Button>
        ) : null}
      </div>

      <input ref={galleryInputRef} type="file" accept={acceptedTypes} className="sr-only" onChange={chooseFile} tabIndex={-1} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="sr-only" onChange={chooseFile} tabIndex={-1} />

      <div className="mt-3 w-full" aria-live="polite">
        {message ? <Alert variant={message.error ? "destructive" : "default"}><AlertDescription>{message.text}</AlertDescription></Alert> : null}
      </div>

      <Dialog open={editorOpen} onOpenChange={(open) => {
        if (operation) return;
        setEditorOpen(open);
        if (!open) clearSource();
      }}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-lg overflow-y-auto p-0" showCloseButton={!operation}>
          <DialogHeader className="px-4 pt-4 pr-12">
            <DialogTitle>Recadrer la photo</DialogTitle>
            <DialogDescription>Déplacez l’image et ajustez le zoom. La photo sera vérifiée par l’administration avant publication.</DialogDescription>
          </DialogHeader>
          <div className="relative h-[min(52dvh,420px)] min-h-64 bg-neutral-950">
            {sourceUrl ? (
              <Cropper
                image={sourceUrl}
                crop={crop}
                zoom={zoom}
                rotation={0}
                minZoom={1}
                maxZoom={3}
                zoomSpeed={1}
                aspect={1}
                cropShape="round"
                showGrid={false}
                style={CROPPER_STYLE}
                classes={CROPPER_CLASSES}
                restrictPosition
                mediaProps={CROPPER_MEDIA_PROPS}
                cropperProps={CROPPER_CONTAINER_PROPS}
                keyboardStep={2}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, area) => setCroppedArea(area)}
              />
            ) : null}
          </div>
          <div className="space-y-2 px-4">
            <label htmlFor="avatar-zoom" className="text-sm font-medium">Zoom</label>
            <input
              id="avatar-zoom"
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              disabled={Boolean(operation)}
              className="h-11 w-full accent-primary"
            />
          </div>
          {message?.error ? (
            <div className="px-4" aria-live="assertive">
              <Alert variant="destructive"><AlertDescription>{message.text}</AlertDescription></Alert>
            </div>
          ) : null}
          <DialogFooter className="mx-0 mb-0 rounded-none">
            <DialogClose asChild><Button type="button" variant="outline" disabled={Boolean(operation)}>Annuler</Button></DialogClose>
            <Button type="button" onClick={saveCrop} disabled={operation === "upload" || !croppedArea}>
              {operation === "upload" ? <LoaderCircle className="animate-spin" /> : <Upload />}
              {operation === "upload" ? "Envoi..." : "Utiliser cette photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeOpen} onOpenChange={(open) => !operation && setRemoveOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la photo ?</DialogTitle>
            <DialogDescription>Vos initiales et la couleur choisie seront de nouveau affichées.</DialogDescription>
          </DialogHeader>
          {message?.error ? (
            <div aria-live="assertive">
              <Alert variant="destructive"><AlertDescription>{message.text}</AlertDescription></Alert>
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" disabled={Boolean(operation)}>Conserver</Button></DialogClose>
            <Button type="button" variant="destructive" onClick={removeAvatar} disabled={operation === "remove"}>
              {operation === "remove" ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              {operation === "remove" ? "Suppression..." : "Supprimer la photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
