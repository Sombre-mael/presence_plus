import "server-only";

import { randomUUID } from "node:crypto";
import { del, get, put } from "@vercel/blob";
import sharp from "sharp";
import {
  PROFILE_AVATAR_OUTPUT_SIZE,
  isManagedAvatarUrl,
  validateAvatarUpload,
} from "@/lib/profile-avatar-domain";

export class ProfileAvatarError extends Error {}

function blobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) throw new ProfileAvatarError("Le service de photo est momentanément indisponible.");
  return token;
}

export function assertProfileAvatarStorageConfigured() {
  blobToken();
}

export async function storeProfileAvatar(userId: string, file: File) {
  const validationError = validateAvatarUpload(file);
  if (validationError) throw new ProfileAvatarError(validationError);

  let sanitized: Buffer;
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), {
      failOn: "error",
      limitInputPixels: 4096 * 4096,
    });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || metadata.width < 320 || metadata.height < 320) {
      throw new ProfileAvatarError("Choisissez une photo d’au moins 320 × 320 pixels.");
    }
    sanitized = await image
      .rotate()
      .resize(PROFILE_AVATAR_OUTPUT_SIZE, PROFILE_AVATAR_OUTPUT_SIZE, { fit: "cover" })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
  } catch (error) {
    if (error instanceof ProfileAvatarError) throw error;
    throw new ProfileAvatarError("Cette image est illisible ou endommagée.");
  }

  const blob = await put(`profile-photos/${userId}/${randomUUID()}.webp`, sanitized, {
    access: "private",
    addRandomSuffix: false,
    cacheControlMaxAge: 86_400,
    contentType: "image/webp",
    token: blobToken(),
  });

  return blob.url;
}

export async function getProfileAvatar(url: string, ifNoneMatch?: string) {
  return get(url, {
    access: "private",
    token: blobToken(),
    ...(ifNoneMatch ? { ifNoneMatch } : {}),
  });
}

export async function deleteProfileAvatar(url?: string | null) {
  if (!url || !isManagedAvatarUrl(url)) return;
  await del(url, { token: blobToken() });
}
