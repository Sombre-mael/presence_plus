import { expect, test } from "@playwright/test";
import { getE2EEnvironment } from "./environment";
import { cleanupAuthUserFixture, createAuthCodeFixture, createAuthTokenFixture, createAuthUserFixture, loginAs } from "./helpers";

test("un accès anonyme est redirigé vers la connexion", async ({ page }) => {
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Bienvenue" })).toBeVisible();
});

test("la connexion reste accessible et sans débordement sur les écrans principaux", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/login");

    const identifier = page.getByLabel("E-mail ou matricule");
    const password = page.getByLabel("Mot de passe", { exact: true });
    await expect(page.getByRole("heading", { name: "Bienvenue" })).toBeVisible();
    await expect(identifier).toBeVisible();
    await expect(password).toBeVisible();
    await expect(page.getByRole("button", { name: "Afficher le mot de passe" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Mot de passe oublié ?" })).toBeVisible();

    await identifier.focus();
    await expect(identifier).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(password).toBeFocused();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  }
});

test("l’activation manuelle reste utilisable sur les écrans principaux", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const viewport of [
    { width: 360, height: 640 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/activate-account");
    await expect(page.getByRole("heading", { name: "Activer votre compte" })).toBeVisible();
    await expect(page.getByText("1. Vérifier le code")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuer" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
  }
});

test("les trois rôles se connectent et restent dans leur périmètre", async ({ page }) => {
  await loginAs(page, "Aline Kabeya");
  await expect(page).toHaveURL(/\/admin\/dashboard/);
  await page.goto("/teacher/dashboard");
  await expect(page).toHaveURL(/\/admin\/dashboard/);

  await page.getByRole("button", { name: /Aline Kabeya/ }).click();
  await page.getByRole("menuitem", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/login/);

  await loginAs(page, "Patrick Ilunga");
  await expect(page).toHaveURL(/\/teacher\/dashboard/);
  await page.goto("/student/dashboard");
  await expect(page).toHaveURL(/\/teacher\/dashboard/);

  await page.context().clearCookies();
  await loginAs(page, "Sarah Mbuyi");
  await expect(page).toHaveURL(/\/student\/dashboard/);
});

test("Sarah peut utiliser son matricule et les erreurs restent génériques", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail ou matricule").fill("compte-inconnu@presence.plus");
  await page.getByLabel("Mot de passe", { exact: true }).fill("MotDePasseIncorrect!2026");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.locator("#login-error")).toContainText("Identifiant ou mot de passe incorrect", { timeout: 60_000 });

  await page.getByLabel("E-mail ou matricule").fill("INF22-041");
  await page.getByLabel("Mot de passe", { exact: true }).fill(getE2EEnvironment().authPassword);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/student\/dashboard/);
});

test("la récupération ne révèle pas l'existence d'un compte", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("E-mail ou matricule").fill("inconnu@presence.plus");
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByText("Si un moyen de récupération est disponible")).toBeVisible();
});

test("la déconnexion invalide la navigation arrière", async ({ page }) => {
  await loginAs(page, "Aline Kabeya");
  await page.getByRole("button", { name: /Aline Kabeya/ }).click();
  await page.getByRole("menuitem", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goBack();
  await expect(page).toHaveURL(/\/login/);
});

test("un compte inactif reçoit la même erreur générique", async ({ page }) => {
  const user = await createAuthUserFixture({ status: "INACTIVE" });
  try {
    await page.goto("/login");
    await page.getByLabel("E-mail ou matricule").fill(user.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Identifiant ou mot de passe incorrect.")).toBeVisible();
  } finally {
    await cleanupAuthUserFixture(user.id);
  }
});

test("un mot de passe initial bloque l'espace métier", async ({ page }) => {
  const user = await createAuthUserFixture({ mustChangePassword: true });
  try {
    await page.goto("/login");
    await page.getByLabel("E-mail ou matricule").fill(user.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/change-password/);
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/change-password/);
  } finally {
    await cleanupAuthUserFixture(user.id);
  }
});

test("une invitation est à usage unique et active le compte", async ({ page }) => {
  const user = await createAuthUserFixture({ activated: false });
  const token = await createAuthTokenFixture(user.id, "INVITATION");
  const password = "J aime apprendre";
  try {
    await page.goto(`/activate-account?token=${encodeURIComponent(token)}`);
    await page.getByLabel("Nouveau mot de passe", { exact: true }).fill(password);
    await page.getByLabel("Confirmer le nouveau mot de passe", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Activer mon compte" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 60_000 });
    await page.goto(`/activate-account?token=${encodeURIComponent(token)}`);
    await expect(page.getByLabel("Code à usage unique")).toBeVisible();
  } finally {
    await cleanupAuthUserFixture(user.id);
  }
});

test("un jeton de réinitialisation expiré est refusé", async ({ page }) => {
  const user = await createAuthUserFixture();
  const token = await createAuthTokenFixture(user.id, "PASSWORD_RESET", true);
  try {
    await page.goto(`/reset-password?token=${encodeURIComponent(token)}`);
    await expect(page.getByLabel("Code à usage unique")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuer" })).toBeVisible();
  } finally {
    await cleanupAuthUserFixture(user.id);
  }
});

test("un étudiant active son compte avec son e-mail et un code", async ({ page }) => {
  const user = await createAuthUserFixture({ role: "STUDENT", activated: false, mustChangePassword: true });
  const code = await createAuthCodeFixture(user.id, "INVITATION");
  const password = "J aime apprendre";
  try {
    await page.goto("/activate-account");
    await page.getByLabel("Adresse e-mail").fill(user.email);
    await page.getByLabel("Code à usage unique").fill(code);
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(page.getByText(/Code vérifié pour/)).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("Nouveau mot de passe", { exact: true }).fill(password);
    await page.getByLabel("Confirmer le nouveau mot de passe", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Activer mon compte" }).click();
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 60_000 });
  } finally {
    await cleanupAuthUserFixture(user.id);
  }
});

test("un utilisateur personnalise son profil", async ({ page }) => {
  const user = await createAuthUserFixture();
  try {
    await page.goto("/login");
    await page.getByLabel("E-mail ou matricule").fill(user.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 60_000 });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/account/profile");
    await expect(page.getByRole("heading", { name: "Mon profil", exact: true })).toBeVisible();
    await expect(page.getByText(user.email, { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Accès administrateur")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    const galleryInput = page.locator('input[type="file"]:not([capture])');
    await galleryInput.setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR42mNkYGD4z8DAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==", "base64"),
    });
    await expect(page.getByRole("heading", { name: "Recadrer la photo" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.getByRole("button", { name: "Annuler" }).click();

    await page.getByLabel("Prénom d’usage").fill("Profil Test");
    await page.getByLabel("Téléphone").fill("+243 999 000 000");
    await page.locator('label:has(input[name="avatarColor"][value="BLUE"])').click();
    await expect(page.getByRole("radio", { name: "Bleu" })).toBeChecked();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Votre profil a été personnalisé.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Profil Test" })).toBeVisible();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();
    await expect(page.getByLabel("Prénom d’usage")).toHaveValue("Profil Test");
    await expect(page.getByLabel("Téléphone")).toHaveValue("+243 999 000 000");
    await expect(page.getByRole("radio", { name: "Bleu" })).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  } finally {
    await cleanupAuthUserFixture(user.id);
  }
});

test("la section système est réservée au super administrateur", async ({ browser }) => {
  const standardAdmin = await createAuthUserFixture({ adminLevel: "STANDARD" });
  const superAdmin = await createAuthUserFixture({ adminLevel: "SUPER" });
  const standardContext = await browser.newContext();
  const superContext = await browser.newContext();
  try {
    const standardPage = await standardContext.newPage();
    await standardPage.goto("/login");
    await standardPage.getByLabel("E-mail ou matricule").fill(standardAdmin.email);
    await standardPage.getByLabel("Mot de passe", { exact: true }).fill(standardAdmin.password);
    await standardPage.getByRole("button", { name: "Se connecter" }).click();
    await expect(standardPage).not.toHaveURL(/\/login/, { timeout: 60_000 });
    await standardPage.goto("/admin/system");
    await expect(standardPage.locator("body")).toContainText("404");
    await expect(standardPage.getByRole("heading", { name: "Administration système" })).toHaveCount(0);

    const superPage = await superContext.newPage();
    await superPage.goto("/login");
    await superPage.getByLabel("E-mail ou matricule").fill(superAdmin.email);
    await superPage.getByLabel("Mot de passe", { exact: true }).fill(superAdmin.password);
    await superPage.getByRole("button", { name: "Se connecter" }).click();
    await expect(superPage).not.toHaveURL(/\/login/, { timeout: 60_000 });
    await superPage.goto("/admin/system");
    await expect(superPage.getByRole("heading", { name: "Administration système" })).toBeVisible();
    await expect(superPage.getByText("Super administrateur", { exact: true }).first()).toBeVisible();
  } finally {
    await standardContext.close();
    await superContext.close();
    await cleanupAuthUserFixture(standardAdmin.id);
    await cleanupAuthUserFixture(superAdmin.id);
  }
});

test("un utilisateur voit ses appareils et révoque une autre session", async ({ browser }) => {
  const user = await createAuthUserFixture();
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();
  async function login(page: typeof first) {
    await page.goto("/login");
    await page.getByLabel("E-mail ou matricule").fill(user.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  }
  try {
    await login(first);
    await login(second);
    await first.goto("/account/security");
    await expect(first.getByText("Appareils connectés")).toBeVisible();
    await first.locator("#sessions-current-password").fill(user.password);
    await first.getByRole("button", { name: "Révoquer", exact: true }).first().click();
    await expect(first.getByText("La session a été révoquée.")).toBeVisible();
    await second.goto("/admin/dashboard");
    await expect(second).toHaveURL(/\/login/);
  } finally {
    await firstContext.close();
    await secondContext.close();
    await cleanupAuthUserFixture(user.id);
  }
});
