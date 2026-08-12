import { describe, expect, it } from "vitest";
import { isWithinSessionStartWindow, shouldAutoCancelSession } from "@/lib/session-lifecycle";

describe("cycle de vie des sessions", () => {
  const start = new Date("2026-08-12T08:00:00.000Z");
  const end = new Date("2026-08-12T10:00:00.000Z");

  it("autorise exactement trente minutes avant et jusqu’à la fin", () => {
    expect(isWithinSessionStartWindow(start, end, new Date("2026-08-12T07:30:00.000Z"))).toBe(true);
    expect(isWithinSessionStartWindow(start, end, end)).toBe(true);
    expect(isWithinSessionStartWindow(start, end, new Date("2026-08-12T07:29:59.999Z"))).toBe(false);
    expect(isWithinSessionStartWindow(start, end, new Date("2026-08-12T10:00:00.001Z"))).toBe(false);
  });

  it("annule automatiquement uniquement une session planifiée dépassée", () => {
    const now = new Date("2026-08-12T10:00:00.001Z");
    expect(shouldAutoCancelSession("SCHEDULED", end, now)).toBe(true);
    expect(shouldAutoCancelSession("ACTIVE", end, now)).toBe(false);
    expect(shouldAutoCancelSession("COMPLETED", end, now)).toBe(false);
    expect(shouldAutoCancelSession("SCHEDULED", end, end)).toBe(false);
  });
});
