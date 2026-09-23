import { expect, test } from "@playwright/test";
import { cleanupAuthUserFixture, createAuthUserFixture } from "./helpers";

test("une demande d’export est validée puis rendue téléchargeable", async ({ page }) => {
  const requestor = await createAuthUserFixture({ role: "STUDENT" });
  const administrator = await createAuthUserFixture({ role: "ADMIN", adminLevel: "STANDARD" });
  try {
    await page.goto("/login");
    await page.getByLabel("E-mail ou matricule").fill(requestor.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(requestor.password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 60_000 });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/account/privacy");
    await expect(page.getByRole("heading", { name: "Confidentialité et mes données" })).toBeVisible();
    await page.getByRole("combobox", { name: "Type de demande" }).click();
    await page.getByRole("option", { name: "Obtenir un export" }).click();
    await page.getByLabel("Précisions").fill("Je souhaite récupérer une copie de mes données de test.");
    await page.getByRole("button", { name: "Transmettre la demande" }).click();
    await expect(page.getByText("Votre demande a été transmise à l’établissement.")).toBeVisible();

    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("E-mail ou matricule").fill(administrator.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(administrator.password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 60_000 });
    await page.goto("/admin/privacy-requests");
    await page.getByPlaceholder("Rechercher un utilisateur").fill(requestor.email);
    await page.getByRole("button", { name: new RegExp(requestor.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).click();
    await page.getByRole("combobox", { name: "Décision" }).click();
    await page.getByRole("option", { name: "Marquer comme traitée" }).click();
    await page.getByLabel("Réponse à l’utilisateur").fill("Votre export personnel est maintenant disponible au téléchargement.");
    await page.getByRole("button", { name: "Enregistrer le suivi" }).click();
    await expect(page.getByText("Le suivi de la demande a été enregistré.")).toBeVisible();

    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("E-mail ou matricule").fill(requestor.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(requestor.password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 60_000 });
    await page.goto("/account/privacy");
    await expect(page.getByRole("link", { name: "Télécharger" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  } finally {
    await cleanupAuthUserFixture(requestor.id);
    await cleanupAuthUserFixture(administrator.id);
  }
});
