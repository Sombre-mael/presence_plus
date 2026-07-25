import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/student/dashboard");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByRole("heading", { name: "Bonjour Sarah" })).toBeVisible();
});

test("la navigation étudiante conserve son état compact", async ({ page }) => {
  const sidebar = page.locator("aside").first();
  await expect(sidebar).toHaveCSS("width", "256px");
  await page.getByRole("button", { name: "Réduire la navigation" }).click();
  await expect(sidebar).toHaveCSS("width", "80px");
  await page.reload();
  await expect(sidebar).toHaveCSS("width", "80px");
  await expect(sidebar.getByRole("link", { name: "Pointer maintenant" })).toBeVisible();
});

test("Sarah peut pointer avec le code tournant puis retrouver le résultat", async ({ page }) => {
  await page.goto("/teacher/sessions/session-001/qr");
  const code = await page.locator("p.metric-number").filter({ hasText: /^PP-/ }).textContent();
  expect(code).toBeTruthy();

  await page.goto("/student/check-in");
  await page.getByRole("tab", { name: "Code manuel" }).click();
  await page.getByLabel("Code affiché par l’enseignant").fill(code!);
  await page.getByRole("button", { name: "Vérifier le code" }).click();
  await expect(page.getByRole("heading", { name: "Algorithmique avancée" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmer ma présence" }).click();
  await expect(page.getByRole("heading", { name: "Présence confirmée" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("presence-plus:academic-data:v3"))).toContain("STUDENT_CODE");

  await page.goto("/student/dashboard");
  await expect(page.getByText("Présence enregistrée")).toBeVisible();
});

test("un refus de caméra conserve le fallback manuel", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new DOMException("Refusée", "NotAllowedError")) },
    });
  });
  await page.goto("/student/check-in");
  await page.getByRole("button", { name: "Ouvrir la caméra" }).click();
  await expect(page.getByText(/caméra est indisponible/i)).toBeVisible();
  await page.getByRole("tab", { name: "Code manuel" }).click();
  await expect(page.getByLabel("Code affiché par l’enseignant")).toBeVisible();
});

test("le planning et l’historique restent lisibles sur mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/student/schedule");
  await expect(page.getByRole("heading", { name: "Mon planning" })).toBeVisible();
  await page.getByRole("tab", { name: "Mois" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);

  await page.goto("/student/history");
  await expect(page.getByRole("heading", { name: "Mon historique" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test("une demande étudiante peut être acceptée par l’enseignant", async ({ page }) => {
  await page.goto("/student/history");
  await page.getByRole("button").filter({ hasText: "2026-07-22" }).click();
  await page.getByRole("button", { name: "Demander une correction" }).click();
  await page.getByPlaceholder("Décrivez ce qui doit être vérifié…").fill("J’étais présent dès le début de cette séance.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Demande de correction").last()).toBeVisible();

  await page.goto("/teacher/sessions/session-004/attendances");
  await expect(page.getByRole("heading", { name: "Demandes de correction" })).toBeVisible();
  await page.getByRole("button", { name: "Examiner" }).click();
  await page.getByPlaceholder("Expliquez votre décision…").fill("Présence confirmée après vérification.");
  await page.getByRole("button", { name: "Enregistrer la décision" }).click();
  await expect(page.getByText("Correction acceptée et appliquée.")).toBeVisible();

  await page.goto("/student/history");
  await page.getByRole("button").filter({ hasText: "2026-07-22" }).click();
  await expect(page.getByText("Acceptée")).toBeVisible();
});
