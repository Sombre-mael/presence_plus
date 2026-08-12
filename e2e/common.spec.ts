import { expect, test } from "@playwright/test";
import { selectDemoProfile } from "./helpers";

test("responsive, mouvement réduit et reprise après panne réseau", async ({ page, context }) => {
  test.setTimeout(180_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.emulateMedia({ reducedMotion: "reduce" });
  await selectDemoProfile(page, "Aline Kabeya");

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/admin/dashboard");
    await expect(page.getByRole("heading", { name: "Pilotage académique" })).toBeVisible();
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(hasHorizontalOverflow, `Débordement horizontal à ${viewport.width}px`).toBe(false);
  }

  const response = await page.evaluate(async () => {
    const result = await fetch("/api/sessions", { credentials: "same-origin" });
    return {
      ok: result.ok,
      status: result.status,
      body: await result.text(),
      cacheControl: result.headers.get("cache-control") ?? "",
    };
  });
  expect(response.ok, `${response.status} ${response.body}`).toBe(true);
  expect(response.cacheControl).toContain("private");
  expect(response.cacheControl).toContain("no-store");

  await context.setOffline(true);
  await page.getByRole("button", { name: /Aline Kabeya/ }).click();
  await page.getByRole("menuitem", { name: "Recharger depuis Neon" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Données affichées hors synchronisation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pilotage académique" })).toBeVisible();

  await context.setOffline(false);
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(page.getByText("Données rechargées depuis Neon.")).toBeVisible();
  await expect(page.getByText("Données affichées hors synchronisation.")).toBeHidden();
  expect(pageErrors).toEqual([]);
});
