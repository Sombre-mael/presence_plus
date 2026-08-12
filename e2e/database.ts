import { Pool, type PoolClient } from "pg";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { E2E_DATABASE_MARKER, getE2EEnvironment } from "./environment";

type Queryable = Pick<Pool | PoolClient, "query">;
const DEMO_PROFILE_SNAPSHOT = ".e2e-demo-profiles.sha256";

export function createE2EPool() {
  return new Pool({
    connectionString: getE2EEnvironment().databaseUrl,
    max: 3,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
    query_timeout: 30_000,
    statement_timeout: 30_000,
  });
}

function isTransientConnectionError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";
  return ["ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"].includes(code)
    || /connection terminated|can't reach database|timeout/i.test(message);
}

export async function queryE2E<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const pool = createE2EPool();
    try {
      await assertE2EDatabase(pool);
      return await pool.query<T>(text, values);
    } catch (error) {
      lastError = error;
      if (!isTransientConnectionError(error) || attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    } finally {
      await pool.end().catch(() => undefined);
    }
  }

  throw lastError;
}

async function connectWithRetry(pool: Pool, attempts = 6) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await pool.connect();
    } catch (error) {
      lastError = error;
      if (!isTransientConnectionError(error) || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
    }
  }
  throw lastError;
}

export async function assertE2EDatabase(database: Queryable) {
  const result = await database.query<{ marker: string | null }>(
    `SELECT shobj_description(oid, 'pg_database') AS marker FROM pg_database WHERE datname = current_database()`,
  );
  if (result.rows[0]?.marker !== E2E_DATABASE_MARKER) {
    throw new Error("Base E2E non marquée : toutes les mutations Playwright sont bloquées.");
  }
}

export async function assertFixedDemoProfiles(database: Queryable) {
  const users = await database.query<{ id: string }>(
    `SELECT id FROM "User" WHERE id = ANY($1::text[]) AND status = 'ACTIVE'`,
    [["u1", "u2", "u4"]],
  );
  const course = await database.query(`SELECT id FROM "Course" WHERE id = 'c1' AND active = true`);
  if (users.rowCount !== 3 || course.rowCount !== 1) {
    throw new Error("Les profils u1/u2/u4 ou le cours c1 requis par les E2E sont absents.");
  }
}

async function fixedDemoProfileFingerprint(database: Queryable) {
  const result = await database.query<{ row: string }>(
    `SELECT row_to_json(snapshot)::text AS row
     FROM (
       SELECT id, name, email, role, status, "promotionId", "updatedAt"
       FROM "User"
       WHERE id = ANY($1::text[])
       ORDER BY id
     ) snapshot`,
    [["u1", "u2", "u4"]],
  );
  if (result.rowCount !== 3) throw new Error("Les trois profils de démonstration sont requis.");
  return createHash("sha256").update(result.rows.map((item) => item.row).join("\n")).digest("hex");
}

export async function saveFixedDemoProfileFingerprint(database: Queryable) {
  await writeFile(DEMO_PROFILE_SNAPSHOT, await fixedDemoProfileFingerprint(database), "utf8");
}

export async function assertFixedDemoProfilesUnchanged(database: Queryable) {
  const [expected, current] = await Promise.all([
    readFile(DEMO_PROFILE_SNAPSHOT, "utf8"),
    fixedDemoProfileFingerprint(database),
  ]);
  if (expected.trim() !== current) {
    throw new Error("Un profil fixe u1, u2 ou u4 a été modifié pendant les E2E.");
  }
}

export async function cleanupAllE2EData() {
  const pool = createE2EPool();
  const client = await connectWithRetry(pool);
  try {
    await assertE2EDatabase(client);
    await client.query("BEGIN");

    const courses = await client.query<{ id: string }>(
      `SELECT id FROM "Course" WHERE code LIKE 'E2E%' OR name LIKE '[E2E:%'`,
    );
    const courseIds = courses.rows.map((row) => row.id);
    const sessions = await client.query<{ id: string }>(
      `SELECT id FROM "Session" WHERE id LIKE 'e2e-%' OR name LIKE '[E2E:%' OR "courseId" = ANY($1::text[])`,
      [courseIds],
    );
    const sessionIds = sessions.rows.map((row) => row.id);
    const corrections = await client.query<{ id: string }>(
      `SELECT id FROM "AttendanceCorrectionRequest" WHERE "sessionId" = ANY($1::text[]) OR reason LIKE '[E2E:%'`,
      [sessionIds],
    );
    const correctionIds = corrections.rows.map((row) => row.id);
    const attendances = await client.query<{ id: string }>(
      `SELECT id FROM "Attendance" WHERE "sessionId" = ANY($1::text[])`,
      [sessionIds],
    );
    const attendanceIds = attendances.rows.map((row) => row.id);
    const users = await client.query<{ id: string }>(
      `SELECT id FROM "User" WHERE email LIKE 'e2e+%@presence.plus' OR name LIKE '[E2E:%'`,
    );
    const userIds = users.rows.map((row) => row.id);
    const promotions = await client.query<{ id: string }>(
      `SELECT id FROM "Promotion" WHERE name LIKE '[E2E:%'`,
    );
    const promotionIds = promotions.rows.map((row) => row.id);
    const entityIds = [...courseIds, ...sessionIds, ...correctionIds, ...attendanceIds, ...userIds, ...promotionIds];

    await client.query(
      `DELETE FROM "AuditLog"
       WHERE "entityId" = ANY($1::text[])
          OR metadata->>'courseId' = ANY($2::text[])
          OR metadata->>'sessionId' = ANY($3::text[])
          OR metadata::text LIKE '%[E2E:%'`,
      [entityIds, courseIds, sessionIds],
    );
    await client.query(
      `DELETE FROM "AttendanceCorrectionRequest" WHERE id = ANY($1::text[]) OR "sessionId" = ANY($2::text[]) OR reason LIKE '[E2E:%'`,
      [correctionIds, sessionIds],
    );
    await client.query(`DELETE FROM "Attendance" WHERE "sessionId" = ANY($1::text[])`, [sessionIds]);
    await client.query(`DELETE FROM "SessionEnrollment" WHERE "sessionId" = ANY($1::text[])`, [sessionIds]);
    await client.query(`DELETE FROM "Session" WHERE id = ANY($1::text[])`, [sessionIds]);
    await client.query(`DELETE FROM "Course" WHERE id = ANY($1::text[])`, [courseIds]);
    await client.query(`DELETE FROM "User" WHERE id = ANY($1::text[])`, [userIds]);
    await client.query(`DELETE FROM "Promotion" WHERE id = ANY($1::text[])`, [promotionIds]);
    await client.query("COMMIT");

    const residue = await client.query<{ count: string }>(
      `SELECT (
        (SELECT count(*) FROM "Session" WHERE id LIKE 'e2e-%' OR name LIKE '[E2E:%') +
        (SELECT count(*) FROM "Course" WHERE code LIKE 'E2E%' OR name LIKE '[E2E:%') +
        (SELECT count(*) FROM "User" WHERE email LIKE 'e2e+%@presence.plus' OR name LIKE '[E2E:%') +
        (SELECT count(*) FROM "Promotion" WHERE name LIKE '[E2E:%') +
        (SELECT count(*) FROM "AttendanceCorrectionRequest" WHERE reason LIKE '[E2E:%') +
        (SELECT count(*) FROM "AuditLog" WHERE metadata::text LIKE '%[E2E:%') +
        (SELECT count(*) FROM "AuditLog" audit
          WHERE audit."actorId" IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM "User" actor WHERE actor.id = audit."actorId"))
      )::text AS count`,
    );
    if (Number(residue.rows[0]?.count ?? 0) !== 0) {
      throw new Error("Le nettoyage E2E a laissé des données de scénario dans Neon.");
    }
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
