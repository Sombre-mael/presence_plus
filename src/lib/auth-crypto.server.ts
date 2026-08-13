import "server-only";

import { createHash, createHmac, randomBytes } from "node:crypto";
import { authSecret } from "@/lib/env.server";

export function normalizeIdentifier(value: string) {
  return value.trim().normalize("NFKC").toLocaleLowerCase("fr");
}

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function hashSensitiveKey(value: string) {
  return createHmac("sha256", authSecret()).update(value, "utf8").digest("hex");
}

export function unusablePassword() {
  return randomBytes(48).toString("base64url");
}
