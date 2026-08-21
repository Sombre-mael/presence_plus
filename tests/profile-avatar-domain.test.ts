import { describe, expect, it } from "vitest";
import {
  isManagedAvatarUrl,
  PROFILE_AVATAR_MAX_SOURCE_BYTES,
  PROFILE_AVATAR_MAX_UPLOAD_BYTES,
  validateAvatarSource,
  validateAvatarUpload,
} from "@/lib/profile-avatar-domain";

describe("photo de profil", () => {
  it("accepte les formats d’image prévus dans les limites de taille", () => {
    expect(validateAvatarSource({ type: "image/jpeg", size: 2_000_000 })).toBeUndefined();
    expect(validateAvatarUpload({ type: "image/webp", size: 250_000 })).toBeUndefined();
  });

  it("refuse les formats non image et les fichiers trop volumineux", () => {
    expect(validateAvatarSource({ type: "image/svg+xml", size: 20_000 })).toMatch(/JPEG/);
    expect(validateAvatarSource({ type: "image/png", size: PROFILE_AVATAR_MAX_SOURCE_BYTES + 1 })).toMatch(/8 Mo/);
    expect(validateAvatarUpload({ type: "image/webp", size: PROFILE_AVATAR_MAX_UPLOAD_BYTES + 1 })).toMatch(/1 Mo/);
  });

  it("ne reconnaît comme gérées que les URL Vercel Blob HTTPS", () => {
    expect(isManagedAvatarUrl("https://store.public.blob.vercel-storage.com/avatars/u1/photo.webp")).toBe(true);
    expect(isManagedAvatarUrl("https://store.private.blob.vercel-storage.com/profile-photos/u1/photo.webp")).toBe(true);
    expect(isManagedAvatarUrl("https://example.com/photo.webp")).toBe(false);
    expect(isManagedAvatarUrl("javascript:alert(1)")).toBe(false);
  });
});
