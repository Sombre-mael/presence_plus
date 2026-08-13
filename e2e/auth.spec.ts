import { expect, test } from "@playwright/test";
import { getE2EEnvironment } from "./environment";
import { cleanupAuthUserFixture, createAuthTokenFixture, createAuthUserFixture, loginAs } from "./helpers";

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
  await page.getByRole("button", { name: "Recevoir un lien" }).click();
  await expect(page.getByText("Si un compte actif correspond à cet identifiant")).toBeVisible();
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
  const password = "Silex!Boussole8-Lumiere-Mangue";
  try {
    await page.goto(`/activate-account?token=${encodeURIComponent(token)}`);
    await page.getByLabel("Nouveau mot de passe", { exact: true }).fill(password);
    await page.getByLabel("Confirmer le nouveau mot de passe", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Activer mon compte" }).click();
    await expect(page).toHaveURL(/\/login\?notice=activated/, { timeout: 60_000 });
    await page.goto(`/activate-account?token=${encodeURIComponent(token)}`);
    await expect(page.getByText("invalide, expiré ou déjà utilisé")).toBeVisible();
  } finally {
    await cleanupAuthUserFixture(user.id);
  }
});

test("un jeton de réinitialisation expiré est refusé", async ({ page }) => {
  const user = await createAuthUserFixture();
  const token = await createAuthTokenFixture(user.id, "PASSWORD_RESET", true);
  try {
    await page.goto(`/reset-password?token=${encodeURIComponent(token)}`);
    await expect(page.getByText("invalide, expiré ou déjà utilisé")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enregistrer le mot de passe" })).toHaveCount(0);
  } finally {
    await cleanupAuthUserFixture(user.id);
  }
});
