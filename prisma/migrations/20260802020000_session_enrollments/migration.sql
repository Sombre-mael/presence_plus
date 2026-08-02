-- Freeze the roster of active and completed sessions so later profile changes
-- cannot rewrite attendance history.
CREATE TABLE "SessionEnrollment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SessionEnrollment_sessionId_studentId_key"
ON "SessionEnrollment"("sessionId", "studentId");

CREATE INDEX "SessionEnrollment_studentId_idx" ON "SessionEnrollment"("studentId");
CREATE INDEX "SessionEnrollment_sessionId_idx" ON "SessionEnrollment"("sessionId");

ALTER TABLE "SessionEnrollment"
ADD CONSTRAINT "SessionEnrollment_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionEnrollment"
ADD CONSTRAINT "SessionEnrollment_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "SessionEnrollment" ("id", "sessionId", "studentId")
SELECT 'enrollment-' || md5(s.id || ':' || u.id), s.id, u.id
FROM "Session" s
JOIN "User" u ON u."promotionId" = s."promotionId"
WHERE s.status IN ('ACTIVE', 'COMPLETED')
  AND u.role = 'STUDENT'
  AND u.status = 'ACTIVE'
ON CONFLICT ("sessionId", "studentId") DO NOTHING;

INSERT INTO "SessionEnrollment" ("id", "sessionId", "studentId")
SELECT 'enrollment-' || md5(a."sessionId" || ':' || a."studentId"), a."sessionId", a."studentId"
FROM "Attendance" a
JOIN "Session" s ON s.id = a."sessionId"
WHERE s.status IN ('ACTIVE', 'COMPLETED')
ON CONFLICT ("sessionId", "studentId") DO NOTHING;
