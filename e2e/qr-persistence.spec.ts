import { expect, test, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { encode } from "next-auth/jwt";
import { queryE2E } from "./database";
import { cleanupSessionFixture, createActiveSessionFixture } from "./helpers";
import { getE2EEnvironment } from "./environment";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${port}`;

async function authenticate(context: BrowserContext, userId: "u2" | "u4", sessionIds: string[]) {
  const result = await queryE2E<{
    id: string;
    name: string;
    email: string;
    role: "TEACHER" | "STUDENT";
    sessionVersion: number;
    mustChangePassword: boolean;
  }>(
    `SELECT id, name, email, role, "sessionVersion", "mustChangePassword"
     FROM "User" WHERE id = $1`,
    [userId],
  );
  const user = result.rows[0];
  if (!user) throw new Error(`Utilisateur E2E ${userId} introuvable.`);
  const authSessionId = randomUUID();
  sessionIds.push(authSessionId);
  await queryE2E(
    `INSERT INTO "AuthSession" (id, "userId", "ipHash", "createdAt", "lastSeenAt", "expiresAt")
     VALUES ($1, $2, 'e2e-qr-persistence', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '8 hours')`,
    [authSessionId, user.id],
  );
  const token = await encode({
    secret: getE2EEnvironment().authSecret,
    maxAge: 8 * 60 * 60,
    token: {
      sub: user.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion,
      mustChangePassword: user.mustChangePassword,
      authSessionId,
    },
  });
  await context.clearCookies();
  await context.addCookies([{
    name: "next-auth.session-token",
    value: token,
    url: baseURL,
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
    expires: Math.floor(Date.now() / 1_000) + 8 * 60 * 60,
  }]);
}

test("le pointage QR crée une présence unique en base", async ({ page, context }) => {
  test.setTimeout(180_000);
  const authSessionIds: string[] = [];
  const sessionId = await createActiveSessionFixture();
  try {
    await authenticate(context, "u2", authSessionIds);
    await page.goto(`/teacher/sessions/${sessionId}/qr`);
    const code = await page.locator("p.metric-number").filter({ hasText: /^[A-F0-9]{8}$/ }).textContent();
    expect(code).toBeTruthy();

    await authenticate(context, "u4", authSessionIds);
    await page.goto("/student/check-in");
    await page.getByRole("tab", { name: "Code manuel" }).click();
    await page.getByLabel("Code affiché par l’enseignant").fill(code!);
    await page.getByRole("button", { name: "Vérifier le code" }).click();
    await page.getByRole("button", { name: "Confirmer ma présence" }).click();
    await expect(page.getByRole("heading", { name: "Présence confirmée" })).toBeVisible();

    const attendance = await queryE2E<{ count: string; source: string; status: string }>(
      `SELECT count(*)::text AS count, min(source::text) AS source, min(status::text) AS status
       FROM "Attendance" WHERE "sessionId" = $1 AND "studentId" = 'u4'`,
      [sessionId],
    );
    expect(attendance.rows[0]).toMatchObject({ count: "1", source: "STUDENT_CODE" });
    expect(["PRESENT", "LATE"]).toContain(attendance.rows[0]?.status);
  } finally {
    await cleanupSessionFixture(sessionId).finally(async () => {
      await queryE2E(`DELETE FROM "AuthSession" WHERE id = ANY($1::text[])`, [authSessionIds]);
    });
  }
});
