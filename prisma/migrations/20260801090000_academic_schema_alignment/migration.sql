-- Align optional identifiers and the initial session lifecycle.
ALTER TABLE "User" ALTER COLUMN "matricule" DROP NOT NULL;
ALTER TABLE "Session" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';

-- Replace free-form actor names with auditable user relations.
ALTER TABLE "Attendance" RENAME COLUMN "correctedBy" TO "correctedById";
ALTER TABLE "AttendanceCorrectionRequest" RENAME COLUMN "resolvedBy" TO "resolvedById";

CREATE INDEX "Attendance_studentId_idx" ON "Attendance"("studentId");
CREATE INDEX "Attendance_sessionId_idx" ON "Attendance"("sessionId");
CREATE INDEX "Attendance_correctedById_idx" ON "Attendance"("correctedById");

CREATE INDEX "AttendanceCorrectionRequest_sessionId_idx" ON "AttendanceCorrectionRequest"("sessionId");
CREATE INDEX "AttendanceCorrectionRequest_studentId_idx" ON "AttendanceCorrectionRequest"("studentId");
CREATE INDEX "AttendanceCorrectionRequest_teacherId_idx" ON "AttendanceCorrectionRequest"("teacherId");
CREATE INDEX "AttendanceCorrectionRequest_resolvedById_idx" ON "AttendanceCorrectionRequest"("resolvedById");
CREATE INDEX "AttendanceCorrectionRequest_studentId_sessionId_status_idx"
  ON "AttendanceCorrectionRequest"("studentId", "sessionId", "status");

ALTER TABLE "Attendance"
  ADD CONSTRAINT "Attendance_correctedById_fkey"
  FOREIGN KEY ("correctedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AttendanceCorrectionRequest"
  ADD CONSTRAINT "AttendanceCorrectionRequest_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
