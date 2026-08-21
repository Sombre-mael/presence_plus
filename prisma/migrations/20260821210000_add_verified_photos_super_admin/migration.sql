-- CreateEnum
CREATE TYPE "AdminLevel" AS ENUM ('STANDARD', 'SUPER');

-- CreateEnum
CREATE TYPE "ProfilePhotoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REPLACED', 'CANCELLED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "adminLevel" "AdminLevel";

-- Existing administrators remain administrators, but only Mael receives the SUPER level.
UPDATE "User" SET "adminLevel" = 'STANDARD' WHERE "role" = 'ADMIN';
UPDATE "User"
SET "name" = 'Maël Kahilu', "adminLevel" = 'SUPER', "sessionVersion" = "sessionVersion" + 1
WHERE "id" = '679a7e93-abee-4a14-bebd-1abeae36ec49' AND "role" = 'ADMIN';

UPDATE "AuthSession"
SET "revokedAt" = NOW(), "revokedReason" = 'ADMIN_LEVEL_CHANGED'
WHERE "userId" = '679a7e93-abee-4a14-bebd-1abeae36ec49' AND "revokedAt" IS NULL;

ALTER TABLE "User"
ADD CONSTRAINT "User_adminLevel_role_check"
CHECK (
  ("role" = 'ADMIN' AND "adminLevel" IS NOT NULL)
  OR ("role" <> 'ADMIN' AND "adminLevel" IS NULL)
);

-- CreateTable
CREATE TABLE "ProfilePhotoSubmission" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "blobUrl" TEXT NOT NULL,
  "status" "ProfilePhotoStatus" NOT NULL DEFAULT 'PENDING',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "reviewReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfilePhotoSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "profilePhotoEnforcementAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- The grace period starts when this migration is deployed.
INSERT INTO "SystemSetting" ("id", "profilePhotoEnforcementAt", "updatedAt")
VALUES ('default', NOW() + INTERVAL '7 days', NOW())
ON CONFLICT ("id") DO NOTHING;

-- CreateIndex
CREATE INDEX "ProfilePhotoSubmission_status_submittedAt_idx" ON "ProfilePhotoSubmission"("status", "submittedAt");
CREATE INDEX "ProfilePhotoSubmission_userId_status_idx" ON "ProfilePhotoSubmission"("userId", "status");
CREATE INDEX "ProfilePhotoSubmission_reviewedById_idx" ON "ProfilePhotoSubmission"("reviewedById");

-- Keep only one current submission and one approved photo per account.
CREATE UNIQUE INDEX "ProfilePhotoSubmission_one_pending_per_user"
ON "ProfilePhotoSubmission"("userId") WHERE "status" = 'PENDING';
CREATE UNIQUE INDEX "ProfilePhotoSubmission_one_approved_per_user"
ON "ProfilePhotoSubmission"("userId") WHERE "status" = 'APPROVED';

-- AddForeignKey
ALTER TABLE "ProfilePhotoSubmission"
ADD CONSTRAINT "ProfilePhotoSubmission_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfilePhotoSubmission"
ADD CONSTRAINT "ProfilePhotoSubmission_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
