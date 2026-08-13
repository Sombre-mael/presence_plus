import "server-only";

import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
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

const MANUAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createManualCode() {
  const raw = Array.from({ length: 10 }, () => MANUAL_CODE_ALPHABET[randomInt(MANUAL_CODE_ALPHABET.length)]).join("");
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

export function normalizeManualCode(value: string) {
  return value.normalize("NFKC").toLocaleUpperCase("fr").replace(/[^A-Z0-9]/g, "");
}

export function hashManualCode(value: string) {
  return hashSensitiveKey(`auth-code:${normalizeManualCode(value)}`);
}

export function unusablePassword() {
  return randomBytes(48).toString("base64url");
}
