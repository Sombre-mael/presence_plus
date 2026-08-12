import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.e2e.local", override: false, quiet: true });

export const E2E_DATABASE_MARKER = "presence-plus:e2e-stabilisation";

function strictSslUrl(value: string) {
  const url = new URL(value);
  if (["prefer", "require", "verify-ca"].includes(url.searchParams.get("sslmode") ?? "")) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}

export function getE2EEnvironment() {
  const databaseUrl = process.env.DATABASE_URL_E2E;
  const authSecret = process.env.AUTH_SECRET_E2E;
  const runId = (process.env.E2E_RUN_ID || "local")
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .slice(0, 32);

  if (!databaseUrl) throw new Error("DATABASE_URL_E2E est requis pour les tests Playwright.");
  if (!authSecret) throw new Error("AUTH_SECRET_E2E est requis pour les tests Playwright.");

  return { databaseUrl: strictSslUrl(databaseUrl), authSecret, runId };
}

export function e2eLabel(label: string) {
  return `[E2E:${getE2EEnvironment().runId}] ${label}`;
}

export function e2eId(label: string) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `e2e-${getE2EEnvironment().runId}-${label}-${suffix}`.toLowerCase();
}
