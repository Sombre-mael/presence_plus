-- Store only the public, unguessable Vercel Blob URL for a user's profile image.
ALTER TABLE "User"
  ADD COLUMN "avatarUrl" TEXT;
