-- Add user-controlled profile details without changing institutional identity data.
CREATE TYPE "AvatarColor" AS ENUM ('EMERALD', 'BLUE', 'AMBER', 'ROSE', 'SLATE');

ALTER TABLE "User"
  ADD COLUMN "preferredName" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "avatarColor" "AvatarColor" NOT NULL DEFAULT 'EMERALD';
