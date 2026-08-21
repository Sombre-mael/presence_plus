export const PROFILE_AVATAR_OUTPUT_SIZE = 512;
export const PROFILE_AVATAR_MAX_SOURCE_BYTES = 8 * 1024 * 1024;
export const PROFILE_AVATAR_MAX_UPLOAD_BYTES = 1024 * 1024;
export const PROFILE_AVATAR_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function validateAvatarSource(file: Pick<File, "size" | "type">) {
  if (!PROFILE_AVATAR_ACCEPTED_TYPES.includes(file.type as (typeof PROFILE_AVATAR_ACCEPTED_TYPES)[number])) {
    return "Choisissez une image JPEG, PNG ou WebP.";
  }
  if (file.size <= 0) return "Cette image est vide.";
  if (file.size > PROFILE_AVATAR_MAX_SOURCE_BYTES) return "La photo d’origine ne doit pas dépasser 8 Mo.";
  return undefined;
}

export function validateAvatarUpload(file: Pick<File, "size" | "type">) {
  if (!PROFILE_AVATAR_ACCEPTED_TYPES.includes(file.type as (typeof PROFILE_AVATAR_ACCEPTED_TYPES)[number])) {
    return "Le format de la photo n’est pas pris en charge.";
  }
  if (file.size <= 0) return "La photo préparée est vide.";
  if (file.size > PROFILE_AVATAR_MAX_UPLOAD_BYTES) return "La photo préparée dépasse 1 Mo.";
  return undefined;
}

export function isManagedAvatarUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}
