ALTER TABLE "SystemSetting"
ADD COLUMN "attendanceAlertThreshold" INTEGER NOT NULL DEFAULT 80,
ADD COLUMN "defaultLateThresholdMinutes" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN "sessionStartEarlyMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "qrRotationSeconds" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN "correctionWindowDays" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE "Promotion" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Promotion_archivedAt_idx" ON "Promotion"("archivedAt");
