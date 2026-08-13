import { describe, expect, it } from "vitest";
import { accountAccessState } from "@/lib/auth-account";

const now = new Date("2026-08-13T10:00:00.000Z");

describe("cycle de vie d’un compte", () => {
  it("priorise la désactivation et le changement de mot de passe", () => {
    expect(accountAccessState({ status: "INACTIVE", activatedAt: now, mustChangePassword: false, now })).toBe("INACTIVE");
    expect(accountAccessState({ status: "ACTIVE", activatedAt: now, mustChangePassword: true, now })).toBe("PASSWORD_CHANGE_REQUIRED");
    expect(accountAccessState({ status: "ACTIVE", activatedAt: now, mustChangePassword: false, now })).toBe("ACTIVE");
  });

  it("distingue une invitation absente, active et expirée", () => {
    expect(accountAccessState({ status: "ACTIVE", activatedAt: null, mustChangePassword: true, now })).toBe("INVITATION_REQUIRED");
    expect(accountAccessState({ status: "ACTIVE", activatedAt: null, mustChangePassword: true, invitation: { usedAt: null, expiresAt: new Date("2026-08-14T10:00:00.000Z") }, now })).toBe("INVITATION_PENDING");
    expect(accountAccessState({ status: "ACTIVE", activatedAt: null, mustChangePassword: true, invitation: { usedAt: null, expiresAt: new Date("2026-08-12T10:00:00.000Z") }, now })).toBe("INVITATION_EXPIRED");
  });
});
