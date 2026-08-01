import { expect, test } from "@playwright/test";
import { cleanupSessionFixture, createActiveSessionFixture, futureAcademicDate, selectDemoProfile } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await selectDemoProfile(page, "Patrick Ilunga");
  await expect(page.getByRole("heading", { name: "Bonjour Patrick" })).toBeVisible();
});

test("la navigation enseignant est animée, compacte et persistante", async ({ page }) => {
  const sidebar = page.locator("aside").first();
  await expect(sidebar).toHaveCSS("width", "256px");
  await page.getByRole("button", { name: "Réduire la navigation" }).click();
  await expect(sidebar).toHaveCSS("width", "80px");
  await page.reload();
  await expect(sidebar).toHaveCSS("width", "80px");
  await expect(page.getByRole("link", { name: "Nouvelle session" })).toBeVisible();
});

test("une session peut être planifiée et persiste après rechargement", async ({ page }) => {
  await page.goto("/teacher/sessions/new");
  await page.getByLabel("Date").fill(futureAcademicDate());
  await page.getByLabel("Salle").fill("C20");
  await page.getByLabel("Heure de début").fill("13:00");
  await page.getByLabel("Heure de fin").fill("15:00");
  await page.getByRole("button", { name: "Planifier la session" }).click();
  await expect(page.getByRole("heading", { name: "Algorithmique avancée" })).toBeVisible();
  await expect(page.getByText("La séance est prête")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Salle")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("presence-plus:academic-data:v3"))).toBeNull();
  const sessionId = new URL(page.url()).pathname.split("/").at(-1);
  if (sessionId) await cleanupSessionFixture(sessionId);
});

test("les vues liste et calendrier restent utilisables sur mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/teacher/sessions");
  await expect(page.getByRole("heading", { name: "Mes sessions" })).toBeVisible();
  await page.getByRole("tab", { name: "Calendrier" }).click();
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test("le QR actif tourne et la feuille de présence est complète", async ({ page }) => {
  const sessionId = await createActiveSessionFixture();
  try {
    await page.goto(`/teacher/sessions/${sessionId}/qr`);
    await expect(page.getByText("Code renouvelé automatiquement")).toBeVisible();
    await expect(page.getByText(/Nouveau code dans/)).toBeVisible();
    await page.getByRole("link", { name: "Présences" }).click();
    await page.waitForURL(`**/teacher/sessions/${sessionId}/attendances`, { timeout: 90_000 });
    await expect(page.getByRole("heading", { name: "Présences de la session" })).toBeVisible();
    await expect(page.getByText("Junior Mpoyi")).toBeVisible();
    await expect(page.getByText("Sarah Mbuyi")).toBeVisible();
  } finally {
    await cleanupSessionFixture(sessionId);
  }
});
