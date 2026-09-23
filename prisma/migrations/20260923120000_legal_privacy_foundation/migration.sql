-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS', 'PRIVACY_NOTICE');

-- CreateEnum
CREATE TYPE "DataSubjectRequestType" AS ENUM ('ACCESS', 'RECTIFICATION', 'EXPORT', 'OBJECTION', 'DELETION');

-- CreateEnum
CREATE TYPE "DataSubjectRequestStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "dataRetentionStartedAt" TIMESTAMP(3),
ADD COLUMN "anonymizedAt" TIMESTAMP(3);

-- Existing inactive accounts enter the retention cycle when this migration is applied.
UPDATE "User"
SET "dataRetentionStartedAt" = CURRENT_TIMESTAMP
WHERE "status" = 'INACTIVE' AND "dataRetentionStartedAt" IS NULL;

-- AlterTable
ALTER TABLE "SystemSetting"
ADD COLUMN "institutionName" TEXT NOT NULL DEFAULT 'Établissement utilisateur de Presence Plus',
ADD COLUMN "institutionAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN "privacyContactEmail" TEXT NOT NULL DEFAULT 'presenceplus12@gmail.com',
ADD COLUMN "privacyContactPhone" TEXT,
ADD COLUMN "institutionLegalDetails" TEXT,
ADD COLUMN "academicRetentionMonths" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN "auditRetentionMonths" INTEGER NOT NULL DEFAULT 24;

-- CreateTable
CREATE TABLE "LegalAcceptance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "documentType" "LegalDocumentType" NOT NULL,
  "version" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipHash" TEXT NOT NULL,
  "userAgent" TEXT,
  CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSubjectRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "DataSubjectRequestType" NOT NULL,
  "details" TEXT,
  "status" "DataSubjectRequestStatus" NOT NULL DEFAULT 'PENDING',
  "responseMessage" TEXT,
  "handledById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "DataSubjectRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalAcceptance_userId_documentType_version_key" ON "LegalAcceptance"("userId", "documentType", "version");
CREATE INDEX "LegalAcceptance_userId_acceptedAt_idx" ON "LegalAcceptance"("userId", "acceptedAt");
CREATE INDEX "DataSubjectRequest_userId_createdAt_idx" ON "DataSubjectRequest"("userId", "createdAt");
CREATE INDEX "DataSubjectRequest_status_createdAt_idx" ON "DataSubjectRequest"("status", "createdAt");
CREATE INDEX "DataSubjectRequest_handledById_idx" ON "DataSubjectRequest"("handledById");

-- AddForeignKey
ALTER TABLE "LegalAcceptance"
ADD CONSTRAINT "LegalAcceptance_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DataSubjectRequest"
ADD CONSTRAINT "DataSubjectRequest_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DataSubjectRequest"
ADD CONSTRAINT "DataSubjectRequest_handledById_fkey"
FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
