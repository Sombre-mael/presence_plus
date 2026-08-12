-- Allow background maintenance to write honest system audit entries.
ALTER TABLE "AuditLog" ALTER COLUMN "actorId" DROP NOT NULL;

ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";
ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Support the recurring lookup for scheduled sessions whose end time has passed.
CREATE INDEX "Session_status_scheduledEndAt_idx"
  ON "Session"("status", "scheduledEndAt");
