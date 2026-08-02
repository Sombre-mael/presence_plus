import { expect, test } from "@playwright/test";
import { selectDemoProfile } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await selectDemoProfile(page, "Aline Kabeya");
  await expect(page.getByRole("heading", { name: "Pilotage académique" })).toBeVisible();
  await expect(page.getByText("Restauration de l’espace")).toHaveCount(0);
});

test("la navigation se rétracte et conserve son état", async ({ page }) => {
  const sidebar = page.locator("aside").first();
  await expect(sidebar).toHaveCSS("width", "256px");

  await page.getByRole("button", { name: "Réduire la navigation" }).click();
  await expect(sidebar).toHaveCSS("width", "80px");
  await page.reload();
  await expect(sidebar).toHaveCSS("width", "80px");

  await page.getByRole("link", { name: "Utilisateurs" }).click();
  await expect(page.getByRole("heading", { name: "Utilisateurs" })).toBeVisible();
});

test("un utilisateur peut être créé, persisté et supprimé", async ({ page }) => {
  const name = "Marc Test";
  await page.goto("/admin/users");
  await page.getByRole("button", { name: "Ajouter un utilisateur" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom complet").fill(name);
  await dialog.getByLabel("Adresse e-mail").fill("marc.test@presence.plus");
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Administrateur" }).click();
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByText(name).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("presence-plus:academic-data:v3"))).toBeNull();

  await page.reload();
  await expect(page.getByText(name).first()).toBeVisible();
  await page.getByText(name).first().click();
  await page.getByRole("button", { name: "Supprimer" }).click();
  await page.getByRole("button", { name: "Supprimer définitivement" }).click();
  await expect(page.getByText(name)).toHaveCount(0);
});

test("une suppression dépendante est bloquée avec une explication", async ({ page }) => {
  await page.goto("/admin/users");
  await page.getByRole("button", { name: /Aline Kabeya aline@presence\.plus/ }).click();

  await expect(page.getByText("Suppression indisponible")).toBeVisible();
  await expect(page.getByText(/compte administrateur actuellement utilisé/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Supprimer" })).toBeDisabled();
});

test("la supervision et l’export statistique sont accessibles", async ({ page }) => {
  await page.goto("/admin/sessions");
  await page.getByRole("link", { name: /Algorithmique avancée/i }).first().click();
  await expect(page.getByRole("heading", { name: "Algorithmique avancée" })).toBeVisible();
  await expect(page.getByText("lecture seule", { exact: false }).first()).toBeVisible();

  await page.goto("/admin/statistics");
  await expect(page.getByText("Évolution du taux de présence")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter en CSV" }).click();
  await expect((await download).suggestedFilename()).toMatch(/statistiques-presence/);
});

test("les listes mobiles ne provoquent pas de débordement horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/users");
  await expect(page.getByRole("button", { name: "Ajouter un utilisateur" })).toBeVisible();
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasOverflow).toBe(false);

  await page.getByRole("button", { name: "Ouvrir la navigation" }).click();
  await expect(page.getByRole("link", { name: "Sessions" })).toBeVisible();
});
