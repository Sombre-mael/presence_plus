import { expect, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import { assertE2EDatabase, createE2EPool } from "./database";
import { e2eId, e2eLabel, getE2EEnvironment } from "./environment";

export { e2eLabel } from "./environment";

export async function loginAs(page: Page, name: "Aline Kabeya" | "Patrick Ilunga" | "Sarah Mbuyi") {
  const identifiers = {
    "Aline Kabeya": "aline@presence.plus",
    "Patrick Ilunga": "patrick@presence.plus",
    "Sarah Mbuyi": "INF22-041",
  } as const;
  await page.goto("/login");
  await page.getByLabel("E-mail ou matricule").fill(identifiers[name]);
  await page.getByLabel("Mot de passe", { exact: true }).fill(getE2EEnvironment().authPassword);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 60_000 });
}

export function futureAcademicDate(days = 7) {
  const value = new Date(Date.now() + days * 86_400_000);
  return academicDate(value);
}

export function academicDate(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lubumbashi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function academicTime(value = new Date()) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Lubumbashi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value).replace(" h ", ":");
}

export function startableSessionSlot(now = new Date()) {
  const localParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lubumbashi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const localHour = Number(localParts.find((part) => part.type === "hour")?.value ?? 0);
  const localMinute = Number(localParts.find((part) => part.type === "minute")?.value ?? 0);

  if (localHour === 23 && localMinute >= 30) {
    const start = new Date(now.getTime() + (60 - now.getMinutes()) * 60_000);
    const end = new Date(start.getTime() + 90 * 60_000);
    return { date: academicDate(start), startTime: academicTime(start), endTime: academicTime(end) };
  }

  const start = new Date(now.getTime() + 5 * 60_000);
  const end = new Date(Math.min(
    start.getTime() + 90 * 60_000,
    new Date(`${academicDate(start)}T21:59:00Z`).getTime(),
  ));
  return { date: academicDate(start), startTime: academicTime(start), endTime: academicTime(end) };
}

export async function getDemoAcademicContext() {
  const pool = createE2EPool();
  try {
    await assertE2EDatabase(pool);
    const result = await pool.query<{
      promotionId: string;
      promotionName: string;
    }>(
      `SELECT p.id AS "promotionId", p.name AS "promotionName"
       FROM "User" student
       JOIN "Promotion" p ON p.id = student."promotionId"
       WHERE student.id = 'u4'`,
    );
    if (!result.rows[0]) throw new Error("La promotion de Sarah est introuvable.");
    return result.rows[0];
  } finally {
    await pool.end();
  }
}

export function uniqueCourseFixture() {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return {
    code: `E2E${suffix}`.slice(0, 12),
    name: e2eLabel(`Cours ${suffix}`),
  };
}

export function uniqueUserFixture() {
  const suffix = Math.random().toString(36).slice(2, 10).toLowerCase();
  return {
    name: e2eLabel(`Utilisateur ${suffix}`),
    email: `e2e+${getE2EEnvironment().runId}-${suffix}@presence.plus`,
  };
}

export async function createAuthUserFixture(options: {
  status?: "ACTIVE" | "INACTIVE";
  activated?: boolean;
  mustChangePassword?: boolean;
  role?: "ADMIN" | "TEACHER" | "STUDENT";
  password?: string;
} = {}) {
  const pool = createE2EPool();
  const id = e2eId("auth-user");
  const suffix = id.slice(-8);
  const email = `e2e+${getE2EEnvironment().runId}-${suffix}@presence.plus`;
  const password = options.password ?? getE2EEnvironment().authPassword;
  const passwordHash = await bcrypt.hash(password, 12);
  const activated = options.activated ?? true;
  try {
    await assertE2EDatabase(pool);
    await pool.query(
      `INSERT INTO "User" (id, name, email, "passwordHash", role, status, "activatedAt", "mustChangePassword", "passwordChangedAt", "sessionVersion", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $7, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, e2eLabel(`Compte Auth ${suffix}`), email, passwordHash, options.role ?? "ADMIN", options.status ?? "ACTIVE", activated ? new Date() : null, options.mustChangePassword ?? false],
    );
    return { id, email, password };
  } finally {
    await pool.end();
  }
}

export async function createAuthTokenFixture(userId: string, type: "INVITATION" | "PASSWORD_RESET", expired = false) {
  const pool = createE2EPool();
  const token = randomBytes(32).toString("base64url");
  try {
    await assertE2EDatabase(pool);
    await pool.query(
      `INSERT INTO "AuthToken" (id, "userId", type, "tokenHash", "expiresAt", "createdAt")
       VALUES ($1, $2, $3, $4,
         (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + CASE WHEN $5 THEN INTERVAL '-1 minute' ELSE INTERVAL '30 minutes' END,
         CURRENT_TIMESTAMP AT TIME ZONE 'UTC')`,
      [e2eId("auth-token"), userId, type, createHash("sha256").update(token).digest("hex"), expired],
    );
    return token;
  } finally {
    await pool.end();
  }
}

export async function createAuthCodeFixture(userId: string, type: "INVITATION" | "PASSWORD_RESET", expired = false) {
  const pool = createE2EPool();
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const raw = Array.from({ length: 10 }, () => alphabet[randomInt(alphabet.length)]).join("");
  const code = `${raw.slice(0, 5)}-${raw.slice(5)}`;
  const token = randomBytes(32).toString("base64url");
  const codeHash = createHmac("sha256", getE2EEnvironment().authSecret).update(`auth-code:${raw}`).digest("hex");
  try {
    await assertE2EDatabase(pool);
    await pool.query(
      `INSERT INTO "AuthToken" (id, "userId", type, "tokenHash", "codeHash", "expiresAt", "createdAt")
       VALUES ($1, $2, $3, $4, $5,
         (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + CASE WHEN $6 THEN INTERVAL '-1 minute' ELSE INTERVAL '30 minutes' END,
         CURRENT_TIMESTAMP AT TIME ZONE 'UTC')`,
      [e2eId("auth-code"), userId, type, createHash("sha256").update(token).digest("hex"), codeHash, expired],
    );
    return code;
  } finally {
    await pool.end();
  }
}

export async function createStudentWithoutEmailFixture() {
  const pool = createE2EPool();
  const id = e2eId("student-no-email");
  const suffix = id.slice(-8).toUpperCase();
  const matricule = `E2E-${suffix}`;
  const password = getE2EEnvironment().authPassword;
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await assertE2EDatabase(pool);
    await pool.query(
      `INSERT INTO "User" (id, name, email, matricule, "promotionId", "passwordHash", role, status, "activatedAt", "mustChangePassword", "sessionVersion", "createdAt", "updatedAt")
       VALUES ($1, $2, NULL, $3, 'p2', $4, 'STUDENT', 'ACTIVE', NULL, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, e2eLabel(`Étudiant sans e-mail ${suffix}`), matricule, passwordHash],
    );
    return { id, matricule };
  } finally {
    await pool.end();
  }
}

export async function cleanupAuthUserFixture(userId: string) {
  const pool = createE2EPool();
  const client = await pool.connect();
  try {
    await assertE2EDatabase(client);
    await client.query("BEGIN");
    await client.query(`DELETE FROM "AuditLog" WHERE "actorId" = $1 OR "entityId" = $1`, [userId]);
    await client.query(`DELETE FROM "AuthToken" WHERE "userId" = $1`, [userId]);
    await client.query(`DELETE FROM "AuthThrottle" WHERE "userId" = $1`, [userId]);
    await client.query(`DELETE FROM "User" WHERE id = $1`, [userId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

export async function createActiveSessionFixture() {
  const pool = createE2EPool();
  const id = e2eId("active-session");
  const start = new Date();
  const end = new Date(start.getTime() + 2 * 60 * 60_000);
  try {
    await assertE2EDatabase(pool);
    const course = await pool.query<{ id: string; promotionId: string; teacherId: string }>(
      `SELECT id, "promotionId", "teacherId" FROM "Course" WHERE id = $1`,
      ["c1"],
    );
    if (!course.rows[0]) throw new Error("Le cours c1 requis par la fixture E2E est introuvable.");
    await pool.query(
      `INSERT INTO "Session" (id, name, "courseId", "promotionId", "teacherId", status, "scheduledStartAt", "scheduledEndAt", "startedAt", room, "lateThresholdMinutes") VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6, $7, $6, $8, $9)`,
      [id, e2eLabel("Session active"), course.rows[0].id, course.rows[0].promotionId, course.rows[0].teacherId, start, end, "E2E", 10],
    );
    await pool.query(
      `INSERT INTO "SessionEnrollment" (id, "sessionId", "studentId") SELECT 'e2e-enrollment-' || $1 || '-' || id, $1, id FROM "User" WHERE role = 'STUDENT' AND status = 'ACTIVE' AND "promotionId" = $2`,
      [id, course.rows[0].promotionId],
    );
    return id;
  } finally {
    await pool.end();
  }
}

export async function cleanupSessionFixture(id: string) {
  const pool = createE2EPool();
  const client = await pool.connect();
  try {
    await assertE2EDatabase(client);
    await client.query("BEGIN");
    const corrections = await client.query<{ id: string }>(
      `SELECT id FROM "AttendanceCorrectionRequest" WHERE "sessionId" = $1`,
      [id],
    );
    const attendances = await client.query<{ id: string }>(
      `SELECT id FROM "Attendance" WHERE "sessionId" = $1`,
      [id],
    );
    const entityIds = [id, ...corrections.rows.map((row) => row.id), ...attendances.rows.map((row) => row.id)];
    await client.query(`DELETE FROM "AuditLog" WHERE "entityId" = ANY($1::text[]) OR metadata->>'sessionId' = $2`, [entityIds, id]);
    await client.query(`DELETE FROM "AttendanceCorrectionRequest" WHERE "sessionId" = $1`, [id]);
    await client.query(`DELETE FROM "Attendance" WHERE "sessionId" = $1`, [id]);
    await client.query(`DELETE FROM "SessionEnrollment" WHERE "sessionId" = $1`, [id]);
    await client.query(`DELETE FROM "Session" WHERE id = $1`, [id]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

export async function latestPendingCorrectionFixture() {
  const pool = createE2EPool();
  try {
    await assertE2EDatabase(pool);
    let row: { id: string; sessionId: string } | undefined;
    for (let attempt = 0; attempt < 10 && !row; attempt += 1) {
      const request = await pool.query<{ id: string; sessionId: string }>(
        `SELECT id, "sessionId" FROM "AttendanceCorrectionRequest" WHERE "studentId" = $1 AND status = 'PENDING' AND reason LIKE '[E2E:%' ORDER BY "createdAt" DESC LIMIT 1`,
        ["u4"],
      );
      row = request.rows[0];
      if (!row) await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!row) throw new Error("La demande de correction E2E n’a pas été créée.");
    const attendance = await pool.query<{
      id: string;
      status: string;
      checkedInAt: Date | null;
      note: string | null;
      correctionReason: string | null;
      correctedAt: Date | null;
      correctedById: string | null;
    }>(
      `SELECT id, status, "checkedInAt", note, "correctionReason", "correctedAt", "correctedById" FROM "Attendance" WHERE "studentId" = $1 AND "sessionId" = $2`,
      ["u4", row.sessionId],
    );
    return { ...row, attendance: attendance.rows[0] ?? null };
  } finally {
    await pool.end();
  }
}

export async function cleanupPendingCorrectionFixtures() {
  const pool = createE2EPool();
  const client = await pool.connect();
  try {
    await assertE2EDatabase(client);
    await client.query("BEGIN");
    const stale = await client.query<{ id: string }>(
      `SELECT id FROM "AttendanceCorrectionRequest" WHERE "studentId" = $1 AND status = 'PENDING' AND reason LIKE '[E2E:%'`,
      ["u4"],
    );
    for (const request of stale.rows) {
      await client.query(`DELETE FROM "AuditLog" WHERE "entityId" = $1`, [request.id]);
      await client.query(`DELETE FROM "AttendanceCorrectionRequest" WHERE id = $1`, [request.id]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

export async function cleanupCorrectionFixture(fixture: Awaited<ReturnType<typeof latestPendingCorrectionFixture>>) {
  const pool = createE2EPool();
  const client = await pool.connect();
  try {
    await assertE2EDatabase(client);
    await client.query("BEGIN");
    await client.query(`DELETE FROM "AttendanceCorrectionRequest" WHERE id = $1`, [fixture.id]);
    await client.query(`DELETE FROM "AuditLog" WHERE "entityId" = $1`, [fixture.id]);
    if (fixture.attendance) {
      await client.query(
        `UPDATE "Attendance" SET status = $1, "checkedInAt" = $2, note = $3, "correctionReason" = $4, "correctedAt" = $5, "correctedById" = $6 WHERE id = $7`,
        [fixture.attendance.status, fixture.attendance.checkedInAt, fixture.attendance.note, fixture.attendance.correctionReason, fixture.attendance.correctedAt, fixture.attendance.correctedById, fixture.attendance.id],
      );
    } else {
      await client.query(`DELETE FROM "Attendance" WHERE "studentId" = $1 AND "sessionId" = $2`, ["u4", fixture.sessionId]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
