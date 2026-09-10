import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { assertE2EDatabase, createE2EPool } from "./database";
import { e2eId, e2eLabel } from "./environment";
import { academicDate, cleanupSessionFixture, loginAs } from "./helpers";

test("une correction applique le statut puis actualise l’assiduité et l’historique étudiant", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const pool = createE2EPool();
  const courseId = e2eId("assiduity-course");
  const sessionId = e2eId("assiduity-session");
  const requestId = e2eId("assiduity-request");
  const courseCode = `E2E${Date.now().toString(36)}`;
  const name = e2eLabel("Assiduité corrigée");
  const studentContext = await browser.newContext();
  const studentPage = await studentContext.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await assertE2EDatabase(pool);
    const { rows: [student] } = await pool.query<{ promotionId: string }>('SELECT "promotionId" FROM "User" WHERE id = $1', ["u4"]);
    const date = academicDate(new Date(Date.now() - 86_400_000));
    await pool.query('INSERT INTO "Course" (id, code, name, "weeklyHours", "promotionId", "teacherId", "updatedAt") VALUES ($1,$2,$3,2,$4,$5,NOW())', [courseId, courseCode, name, student.promotionId, "u2"]);
    await pool.query('INSERT INTO "Session" (id,name,"courseId","promotionId","teacherId",status,"scheduledStartAt","scheduledEndAt","completedAt",room,"lateThresholdMinutes") VALUES ($1,$2,$3,$4,$5,\'COMPLETED\',$6,$7,$7,\'E2E\',10)', [sessionId, name, courseId, student.promotionId, "u2", `${date}T06:00:00Z`, `${date}T08:00:00Z`]);
    await pool.query('INSERT INTO "SessionEnrollment" (id,"sessionId","studentId") VALUES ($1,$2,$3)', [e2eId("enrollment"), sessionId, "u4"]);
    await pool.query('INSERT INTO "Attendance" (id,"sessionId","studentId",status,source,"checkedInAt","updatedAt") VALUES ($1,$2,$3,\'LATE\',\'QR\',$4,NOW())', [e2eId("attendance"), sessionId, "u4", `${date}T06:45:00Z`]);
    await pool.query('INSERT INTO "AttendanceCorrectionRequest" (id,"sessionId","studentId","teacherId","requestedStatus",reason,"updatedAt") VALUES ($1,$2,$3,$4,\'PRESENT\',$5,NOW())', [requestId, sessionId, "u4", "u2", e2eLabel("Retard à corriger après vérification")]);

    await loginAs(studentPage, "Sarah Mbuyi");
    await studentPage.goto("/student/history");
    await studentPage.getByPlaceholder("Cours ou enseignant...").fill(name);
    const historyRow = studentPage.getByRole("button").filter({ hasText: name });
    await expect(historyRow.getByText("En retard", { exact: true })).toBeVisible();
    await loginAs(page, "Patrick Ilunga");
    await page.goto(`/teacher/corrections?request=${requestId}`);
    const request = page.locator("article").filter({ hasText: name });
    await request.getByRole("button", { name: "Examiner" }).click();
    await expect(page.getByLabel("Statut retenu")).toContainText("Présent");
    await expect(page.getByLabel("Heure de pointage (si connue)")).toHaveValue("08:45");
    await page.getByLabel("Motif de la décision").fill("Présence confirmée, retard de saisie technique.");
    await page.getByRole("button", { name: "Enregistrer la décision" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    const { rows: [saved] } = await pool.query('SELECT a.status, r."resolvedStatus", r."attendanceId" FROM "Attendance" a JOIN "AttendanceCorrectionRequest" r ON r."sessionId"=a."sessionId" AND r."studentId"=a."studentId" WHERE r.id=$1', [requestId]);
    expect(saved.status).toBe("PRESENT");
    expect(saved.resolvedStatus).toBe("PRESENT");
    expect(saved.attendanceId).toBeTruthy();
    await expect(historyRow.getByText("Présent", { exact: true })).toBeVisible({ timeout: 60_000 });

    await page.goto(`/teacher/sessions/${sessionId}/attendances`);
    await expect(page.getByText("Présent", { exact: true })).toBeVisible();
    await page.goto(`/teacher/assiduity?course=${courseId}`);
    await page.getByLabel("Étudiant", { exact: true }).fill("Sarah");
    const studentRow = page.getByRole("button", { name: `Voir l’assiduité de Sarah Mbuyi en ${courseCode}` });
    await expect(studentRow).toContainText("100 %");
    await expect(studentRow).toContainText("0 retard(s)");
    await mkdir("artifacts/teacher-assiduity", { recursive: true });
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(studentRow).toBeVisible();
      await expect.poll(() => page.locator("main").evaluate((element) => element.getBoundingClientRect().left)).toBeGreaterThanOrEqual(width >= 1024 ? 256 : 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `artifacts/teacher-assiduity/${width}.png`, fullPage: true, animations: "disabled" });
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await studentRow.click();
    await expect(page.getByRole("dialog").getByText("Présent", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await studentContext.close();
    await assertE2EDatabase(pool);
    await pool.query('DELETE FROM "Notification" WHERE "dedupeKey"=$1', [`correction-resolved:${requestId}`]);
    await cleanupSessionFixture(sessionId);
    await pool.query('DELETE FROM "Course" WHERE id=$1', [courseId]);
    await pool.end();
  }
});
