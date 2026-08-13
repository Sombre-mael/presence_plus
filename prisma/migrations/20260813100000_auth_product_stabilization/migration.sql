-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- CreateEnum
CREATE TYPE "AuthDeliveryStatus" AS ENUM ('NOT_APPLICABLE', 'SIMULATED', 'ACCEPTED', 'FAILED');

-- AlterEnum
ALTER TYPE "AuthThrottleAction" ADD VALUE 'TOKEN_VERIFY';

-- AlterTable
ALTER TABLE "AuthToken"
ADD COLUMN "codeHash" TEXT,
ADD COLUMN "deliveryStatus" "AuthDeliveryStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
ADD COLUMN "providerMessageId" TEXT,
ADD COLUMN "deliveryAttemptedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_codeHash_key" ON "AuthToken"("codeHash");
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");
CREATE INDEX "AuthSession_userId_revokedAt_idx" ON "AuthSession"("userId", "revokedAt");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
