import type { Area } from "react-easy-crop";
import { PROFILE_AVATAR_MAX_UPLOAD_BYTES, PROFILE_AVATAR_OUTPUT_SIZE } from "@/lib/profile-avatar-domain";

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
    image.src = source;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("IMAGE_EXPORT_FAILED")),
      "image/webp",
      quality,
    );
  });
}

export async function createCroppedAvatar(source: string, crop: Area) {
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  canvas.width = PROFILE_AVATAR_OUTPUT_SIZE;
  canvas.height = PROFILE_AVATAR_OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("CANVAS_UNAVAILABLE");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    PROFILE_AVATAR_OUTPUT_SIZE,
    PROFILE_AVATAR_OUTPUT_SIZE,
  );

  let blob = await canvasToBlob(canvas, 0.86);
  if (blob.size > PROFILE_AVATAR_MAX_UPLOAD_BYTES) blob = await canvasToBlob(canvas, 0.72);
  if (blob.size > PROFILE_AVATAR_MAX_UPLOAD_BYTES) throw new Error("IMAGE_TOO_LARGE");

  return new File([blob], "photo-profil.webp", {
    type: blob.type || "image/webp",
    lastModified: Date.now(),
  });
}
