-- A test or freshly bootstrapped environment may not contain the production account yet.
-- Keep the system operable by promoting the oldest active administrator only when no SUPER exists.
WITH fallback AS (
  SELECT "id"
  FROM "User"
  WHERE "role" = 'ADMIN' AND "status" = 'ACTIVE'
  ORDER BY "createdAt" ASC, "id" ASC
  LIMIT 1
)
UPDATE "User"
SET "adminLevel" = 'SUPER', "sessionVersion" = "sessionVersion" + 1
WHERE "id" = (SELECT "id" FROM fallback)
  AND NOT EXISTS (
    SELECT 1 FROM "User"
    WHERE "role" = 'ADMIN' AND "status" = 'ACTIVE' AND "adminLevel" = 'SUPER'
  );

UPDATE "AuthSession"
SET "revokedAt" = NOW(), "revokedReason" = 'ADMIN_LEVEL_CHANGED'
WHERE "userId" IN (
  SELECT "id" FROM "User"
  WHERE "role" = 'ADMIN' AND "status" = 'ACTIVE' AND "adminLevel" = 'SUPER'
)
AND "revokedAt" IS NULL;
