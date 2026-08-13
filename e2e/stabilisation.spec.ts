import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { cleanupAllE2EData, queryE2E } from "./database";
import {
  e2eLabel,
  getDemoAcademicContext,
  loginAs,
  startableSessionSlot,
  uniqueCourseFixture,
} from "./helpers";

test.describe.serial("jalon transversal de stabilisation", () => {
  test("admin → enseignant → étudiant → enseignant → admin", async ({ page, context }) => {
    test.setTimeout(480_000);
    const academic = await getDemoAcademicContext();
    const course = uniqueCourseFixture();
    const sessionName = e2eLabel("Session transversale");
    const correctionReason = e2eLabel("Mon arrivée doit être vérifiée pour cette séance.");
    const slot = startableSessionSlot();
    let sessionId = "";
    let courseId = "";
    let secondStudentPage: Awaited<ReturnType<typeof context.newPage>> | undefined;

    try {
      console.log("[stabilisation] administration: création du cours");
      await loginAs(page, "Aline Kabeya");
      await page.goto("/admin/courses");
      await page.getByRole("button", { name: "Ajouter un cours" }).click();
      const courseDialog = page.getByRole("dialog");
      await courseDialog.getByLabel("Code").fill(course.code);
      await courseDialog.getByLabel("Heures par semaine").fill("3");
      await courseDialog.getByLabel("Intitulé").fill(course.name);
      await courseDialog.getByLabel("Description").fill(e2eLabel("Cours du scénario transversal"));
      await courseDialog.locator("#course-teacher").click();
      await page.getByRole("option", { name: "Patrick Ilunga" }).click();
      await courseDialog.locator("#course-promotion").click();
      await page.getByRole("option", { name: academic.promotionName }).click();
      await courseDialog.getByRole("button", { name: "Ajouter", exact: true }).click();
      await expect(page.getByText(course.name).first()).toBeVisible();

      const storedCourse = await queryE2E<{ id: string }>(
        `SELECT id FROM "Course" WHERE code = $1 AND name = $2`,
        [course.code, course.name],
      );
      courseId = storedCourse.rows[0]?.id ?? "";
      expect(courseId).toBeTruthy();
      const courseAudit = await queryE2E(
        `SELECT id FROM "AuditLog" WHERE action = 'CREATE_COURSE' AND "entityId" = $1`,
        [courseId],
      );
      expect(courseAudit.rowCount).toBe(1);

      console.log("[stabilisation] enseignant: planification et conflits");
      await loginAs(page, "Patrick Ilunga");
      await page.goto("/teacher/sessions/new");
      await page.getByLabel("Titre de la séance").fill(sessionName);
      await page.getByLabel("Cours").click();
      await page.getByRole("option", { name: new RegExp(course.code) }).click();
      await page.getByLabel("Date").fill(slot.date);
      await page.getByLabel("Salle").fill("E2E-101");
      await page.getByLabel("Heure de début").fill(slot.startTime);
      await page.getByLabel("Heure de fin").fill(slot.endTime);
      await page.getByRole("button", { name: "Planifier la session" }).click();
      await expect(page.getByRole("heading", { name: sessionName })).toBeVisible();
      sessionId = new URL(page.url()).pathname.split("/").at(-1) ?? "";
      expect(sessionId).toBeTruthy();

      await page.goto("/teacher/sessions/new");
      await page.getByLabel("Titre de la séance").fill(e2eLabel("Conflit promotion"));
      await page.getByLabel("Cours").click();
      await page.getByRole("option", { name: new RegExp(course.code) }).click();
      await page.getByLabel("Date").fill(slot.date);
      await page.getByLabel("Salle").fill("E2E-102");
      await page.getByLabel("Heure de début").fill(slot.startTime);
      await page.getByLabel("Heure de fin").fill(slot.endTime);
      await page.getByRole("button", { name: "Planifier la session" }).click();
      await expect(page.getByText(/promotion a déjà un cours sur ce créneau/i).first()).toBeVisible();

      await page.goto(`/teacher/sessions/${sessionId}`);
      await page.getByRole("button", { name: "Démarrer", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Démarrer la session" }).click();
      await page.waitForURL(`**/teacher/sessions/${sessionId}/qr`);
      await expect(page.getByText("Code renouvelé automatiquement")).toBeVisible();
      const code = await page.locator("p.metric-number").filter({ hasText: /^[A-F0-9]{8}$/ }).textContent();
      expect(code).toBeTruthy();

      const active = await queryE2E<{ status: string; enrolled: string }>(
        `SELECT s.status, count(e.id)::text AS enrolled
         FROM "Session" s LEFT JOIN "SessionEnrollment" e ON e."sessionId" = s.id
         WHERE s.id = $1 GROUP BY s.id`,
        [sessionId],
      );
      expect(active.rows[0]?.status).toBe("ACTIVE");
      expect(Number(active.rows[0]?.enrolled ?? 0)).toBeGreaterThan(0);

      console.log("[stabilisation] étudiant: pointage et idempotence");
      await loginAs(page, "Sarah Mbuyi");
      await page.goto("/student/check-in");
      await page.getByRole("tab", { name: "Code manuel" }).click();
      await page.getByLabel("Code affiché par l’enseignant").fill(code!);
      await page.getByRole("button", { name: "Vérifier le code" }).click();
      await expect(page.getByRole("heading", { name: course.name })).toBeVisible();
      await page.getByRole("button", { name: "Confirmer ma présence" }).click();
      await expect(page.getByRole("heading", { name: "Présence confirmée" })).toBeVisible();

      await page.getByRole("button", { name: "Scanner un autre code" }).click();
      await page.getByRole("tab", { name: "Code manuel" }).click();
      await page.getByLabel("Code affiché par l’enseignant").fill(code!);
      await page.getByRole("button", { name: "Vérifier le code" }).click();
      await expect(page.getByRole("heading", { name: "Pointage déjà effectué" })).toBeVisible();

      const attendance = await queryE2E<{ count: string }>(
        `SELECT count(*)::text AS count FROM "Attendance" WHERE "sessionId" = $1 AND "studentId" = 'u4'`,
        [sessionId],
      );
      expect(Number(attendance.rows[0]?.count ?? 0)).toBe(1);

      console.log("[stabilisation] enseignant: clôture atomique");
      await loginAs(page, "Patrick Ilunga");
      await page.goto(`/teacher/sessions/${sessionId}`);
      await page.getByRole("button", { name: "Clôturer", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Clôturer la session" }).click();
      await expect(page.getByText("Séance clôturée")).toBeVisible();

      const completed = await queryE2E<{ status: string; missing: string }>(
        `SELECT s.status,
          (SELECT count(*) FROM "SessionEnrollment" e WHERE e."sessionId" = s.id) -
          (SELECT count(*) FROM "Attendance" a WHERE a."sessionId" = s.id) AS missing
         FROM "Session" s WHERE s.id = $1`,
        [sessionId],
      );
      expect(completed.rows[0]?.status).toBe("COMPLETED");
      expect(Number(completed.rows[0]?.missing ?? -1)).toBe(0);

      console.log("[stabilisation] étudiant: demandes concurrentes");
      await loginAs(page, "Sarah Mbuyi");
      await page.goto("/student/history");
      await page.getByRole("button").filter({ hasText: course.name }).click();
      secondStudentPage = await context.newPage();
      await secondStudentPage.goto("/student/history");
      await secondStudentPage.getByRole("button").filter({ hasText: course.name }).click();

      await page.getByRole("button", { name: "Demander une correction" }).click();
      await page.getByPlaceholder("Décrivez ce qui doit être vérifié…").fill(correctionReason);
      await secondStudentPage.getByRole("button", { name: "Demander une correction" }).click();
      await secondStudentPage.getByPlaceholder("Décrivez ce qui doit être vérifié…").fill(e2eLabel("Deuxième demande concurrente."));
      await page.getByRole("button", { name: "Envoyer" }).click();
      await expect(page.getByRole("button", { name: "Annuler la demande" })).toBeVisible();
      await secondStudentPage.getByRole("button", { name: "Envoyer" }).click();
      await expect(secondStudentPage.getByRole("dialog").getByText(/déjà en attente/i)).toBeVisible();
      await secondStudentPage.close();
      secondStudentPage = undefined;

      console.log("[stabilisation] enseignant: résolution de la correction");
      await loginAs(page, "Patrick Ilunga");
      await page.goto(`/teacher/sessions/${sessionId}/attendances`);
      await expect(page.getByRole("heading", { name: "Demandes de correction" })).toBeVisible();
      await page.getByRole("button", { name: "Examiner" }).click();
      await page.getByRole("button", { name: "Accepter" }).click();
      await page.getByRole("dialog").locator('input[type="time"]').fill("23:59");
      await page.getByPlaceholder("Expliquez votre décision…").fill("Arrivée confirmée après vérification du registre.");
      await page.getByRole("button", { name: "Enregistrer la décision" }).click();
      await expect(page.getByText("Correction acceptée et appliquée.")).toBeVisible();

      console.log("[stabilisation] étudiant: décision confirmée");
      await loginAs(page, "Sarah Mbuyi");
      await page.goto("/student/history");
      await page.getByRole("button").filter({ hasText: course.name }).click();
      await expect(page.getByText("Acceptée")).toBeVisible();

      console.log("[stabilisation] administration: statistiques, export et audit");
      await loginAs(page, "Aline Kabeya");
      await page.goto(`/admin/sessions?course=${courseId}&status=COMPLETED&date=${slot.date}`);
      await expect(page.getByText(course.name).first()).toBeVisible();
      await page.goto("/admin/statistics");
      await page.getByLabel("Promotion statistique").click();
      await page.getByRole("option", { name: academic.promotionName }).click();
      await page.getByLabel("Cours statistique").click();
      await page.getByRole("option", { name: new RegExp(course.code) }).click();
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Exporter en CSV" }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const csv = await readFile(downloadPath!, "utf8");
      expect(csv).toContain(course.code);
      expect(csv).toContain(course.name);

      await page.goto(`/admin/audit?q=${encodeURIComponent(sessionId)}`);
      await expect(page.getByText(sessionId).first()).toBeVisible();
      await expect(page.getByRole("row").filter({ hasText: sessionId }).filter({ hasText: "Création d’une session" })).toBeVisible();
      await expect(page.getByRole("row").filter({ hasText: sessionId }).filter({ hasText: "Démarrage d’une session" })).toBeVisible();
      await expect(page.getByRole("row").filter({ hasText: sessionId }).filter({ hasText: "Clôture d’une session" })).toBeVisible();
    } finally {
      console.log("[stabilisation] nettoyage contrôlé");
      await secondStudentPage?.close().catch(() => undefined);
      await context.close().catch(() => undefined);
      await cleanupAllE2EData();
    }
  });
});
