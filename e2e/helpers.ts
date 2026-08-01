import { expect, type Page } from "@playwright/test";
import "dotenv/config";
import { Pool } from "pg";

export async function selectDemoProfile(page: Page, name: "Aline Kabeya" | "Patrick Ilunga" | "Sarah Mbuyi") {
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export function futureAcademicDate(days = 7) {
  const value = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lubumbashi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export async function createActiveSessionFixture() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const id = `e2e-active-${Date.now()}`;
  const start = new Date();
  const end = new Date(start.getTime() + 2 * 60 * 60_000);
  try {
    const course = await pool.query<{ id: string; promotionId: string; teacherId: string }>(
      `SELECT id, "promotionId", "teacherId" FROM "Course" WHERE id = $1`,
      ["c1"],
    );
    if (!course.rows[0]) throw new Error("Le cours c1 requis par la fixture E2E est introuvable.");
    await pool.query(
      `INSERT INTO "Session" (id, name, "courseId", "promotionId", "teacherId", status, "scheduledStartAt", "scheduledEndAt", "startedAt", room, "lateThresholdMinutes") VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6, $7, $6, $8, $9)`,
      [id, "Session active Playwright", course.rows[0].id, course.rows[0].promotionId, course.rows[0].teacherId, start, end, "E2E", 10],
    );
    return id;
  } finally {
    await pool.end();
  }
}

export async function cleanupSessionFixture(id: string) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM "AttendanceCorrectionRequest" WHERE "sessionId" = $1`, [id]);
    await client.query(`DELETE FROM "Attendance" WHERE "sessionId" = $1`, [id]);
    await client.query(`DELETE FROM "AuditLog" WHERE "entityId" = $1 OR "entityId" LIKE $2`, [id, `${id}:%`]);
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
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const request = await pool.query<{ id: string; sessionId: string }>(
      `SELECT id, "sessionId" FROM "AttendanceCorrectionRequest" WHERE "studentId" = $1 AND status = 'PENDING' ORDER BY "createdAt" DESC LIMIT 1`,
      ["u4"],
    );
    const row = request.rows[0];
    if (!row) throw new Error("La demande de correction E2E n'a pas été créée.");
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

export async function cleanupCorrectionFixture(fixture: Awaited<ReturnType<typeof latestPendingCorrectionFixture>>) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
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
