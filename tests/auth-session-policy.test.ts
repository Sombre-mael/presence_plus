import { describe, expect, it } from "vitest";
import {
  AUTH_SESSION_MAX_AGE_MS,
  AUTH_SESSION_TOKEN_MAX_AGE_SECONDS,
  isAuthSessionIdleExpired,
} from "@/lib/auth-session-policy";

describe("politique de persistance des sessions", () => {
  const now = new Date("2026-09-11T12:00:00.000Z");

  it("conserve un jeton pendant quatorze jours", () => {
    expect(AUTH_SESSION_TOKEN_MAX_AGE_SECONDS).toBe(14 * 24 * 60 * 60);
    expect(AUTH_SESSION_MAX_AGE_MS).toBe(AUTH_SESSION_TOKEN_MAX_AGE_SECONDS * 1_000);
  });

  it("expire une session après sept jours sans activité", () => {
    expect(isAuthSessionIdleExpired(new Date("2026-09-04T12:00:01.000Z"), now)).toBe(false);
    expect(isAuthSessionIdleExpired(new Date("2026-09-04T12:00:00.000Z"), now)).toBe(true);
  });
});
