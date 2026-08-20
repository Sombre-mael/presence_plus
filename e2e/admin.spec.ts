import { expect, test } from "@playwright/test";
import { loginAs, uniqueUserFixture } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await loginAs(page, "Aline Kabeya");
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
  const { name, email } = uniqueUserFixture();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/users");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.evaluate(() => Object.defineProperty(navigator, "share", {
    configurable: true,
    value: async (data: ShareData) => { Reflect.set(window, "__sharedAccess", data); },
  }));
  await page.getByRole("button", { name: "Ajouter un utilisateur" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom complet").fill(name);
  await dialog.getByLabel("Adresse e-mail").fill(email);
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Administrateur" }).click();
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  const accessDialog = page.getByRole("dialog");
  await expect(accessDialog.getByRole("heading", { name: "Partager l’accès initial" })).toBeVisible();
  await expect(accessDialog.getByRole("button", { name: "Partager le lien" })).toBeVisible();
  await expect(accessDialog.getByRole("link", { name: "Ouvrir le lien" })).toHaveAttribute("href", /\/activate-account\?token=/);
  expect(await accessDialog.evaluate((element) => element.scrollWidth > element.clientWidth + 1)).toBe(false);
  await accessDialog.getByRole("button", { name: "Partager le lien" }).click();
  await expect(accessDialog.getByRole("button", { name: "Lien partagé" })).toBeVisible();
  expect(await page.evaluate(() => String((Reflect.get(window, "__sharedAccess") as ShareData | undefined)?.url))).toContain("/activate-account?token=");
  await page.evaluate(() => Object.defineProperty(navigator, "share", { configurable: true, value: undefined }));
  await accessDialog.getByRole("button", { name: "Lien partagé" }).click();
  await expect(accessDialog.getByRole("button", { name: "Lien copié" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("/activate-account?token=");
  await accessDialog.getByRole("button", { name: "Terminer" }).click();
  await expect(page.getByText(name).last()).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("presence-plus:academic-data:v3"))).toBeNull();

  await page.reload();
  await expect(page.getByText(name).last()).toBeVisible();
  await page.getByText(name).last().click();
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
  await expect(page).toHaveURL(/\/admin\/sessions\/[^/]+$/);
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
