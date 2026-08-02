import "server-only";

import { ServerConfigurationError } from "@/lib/server-errors";

function required(name: "DATABASE_URL" | "AUTH_SECRET") {
  const value = process.env[name]?.trim();
  if (!value) throw new ServerConfigurationError(`La variable ${name} est requise.`);
  return value;
}

export function databaseUrl() {
  const value = required("DATABASE_URL");
  try {
    const url = new URL(value);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Protocole invalide");
  } catch (error) {
    throw new ServerConfigurationError(`DATABASE_URL n'est pas une URL PostgreSQL valide: ${error instanceof Error ? error.message : "format invalide"}.`);
  }
  return value;
}

export function authSecret() {
  return required("AUTH_SECRET");
}
