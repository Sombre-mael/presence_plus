import { expect, test } from "@playwright/test";
import { getE2EEnvironment } from "./environment";
import { cleanupAuthUserFixture, createAuthCodeFixture, createAuthTokenFixture, createAuthUserFixture, createStudentWithoutEmailFixture, loginAs } from "./helpers";

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
  const password = "Silex!Boussole8-Lumiere-Mangue";
  try {
    await page.goto(`/activate-account?token=${encodeURIComponent(token)}`);
    await page.getByLabel("Nouveau mot de passe", { exact: true }).fill(password);
    await page.getByLabel("Confirmer le nouveau mot de passe", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Activer mon compte" }).click();
    await expect(page).toHaveURL(/\/login\?notice=activated/, { timeout: 60_000 });
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
    await expect(page.getByRole("button", { name: "Enregistrer le mot de passe" })).toBeVisible();
  } finally {
    await cleanupAuthUserFixture(user.id);
  }
});

test("un étudiant sans e-mail active son compte avec son matricule et un code", async ({ page }) => {
  const user = await createStudentWithoutEmailFixture();
  const code = await createAuthCodeFixture(user.id, "INVITATION");
  const password = "Silex!Boussole8-Lumiere-Mangue";
  try {
    await page.goto("/activate-account");
    await page.getByLabel("E-mail ou matricule").fill(user.matricule);
    await page.getByLabel("Code à usage unique").fill(code);
    await page.getByLabel("Nouveau mot de passe", { exact: true }).fill(password);
    await page.getByLabel("Confirmer le nouveau mot de passe", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Activer mon compte" }).click();
    await expect(page).toHaveURL(/\/login\?notice=activated/, { timeout: 60_000 });
    await page.getByLabel("E-mail ou matricule").fill(user.matricule);
    await page.getByLabel("Mot de passe", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/student\/dashboard/);
  } finally {
    await cleanupAuthUserFixture(user.id);
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
