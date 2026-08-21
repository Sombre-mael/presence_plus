import { describe, expect, it } from "vitest";
import {
  buildAccountPhotoState,
  profilePhotoGraceDays,
  profilePhotoUrl,
  profilePhotoVerificationStatus,
} from "@/lib/profile-photo-domain";

describe("vérification de photo", () => {
  const now = new Date("2026-08-21T10:00:00.000Z");
  const enforcementAt = new Date("2026-08-28T10:00:00.000Z");

  it("donne la priorité à une soumission en attente tout en conservant la photo approuvée", () => {
    const state = buildAccountPhotoState({
      approvedId: "approved-1",
      pendingSubmittedAt: now,
      enforcementAt,
      now,
    });
    expect(state.status).toBe("PENDING");
    expect(state.approvedPhotoUrl).toBe("/api/profile-photos/approved-1");
    expect(state.requiredNow).toBe(false);
  });

  it("bloque après la période de grâce uniquement sans photo approuvée", () => {
    const missing = buildAccountPhotoState({ enforcementAt, now: new Date("2026-08-29T10:00:00.000Z") });
    const approved = buildAccountPhotoState({ approvedId: "photo-1", enforcementAt, now: new Date("2026-08-29T10:00:00.000Z") });
    expect(missing.requiredNow).toBe(true);
    expect(approved.requiredNow).toBe(false);
  });

  it("calcule un statut et un délai stables pour l’interface", () => {
    expect(profilePhotoVerificationStatus({ approved: false, pending: false, rejected: true })).toBe("REJECTED");
    expect(profilePhotoGraceDays(enforcementAt.toISOString(), now)).toBe(7);
    expect(profilePhotoUrl("photo avec espace")).toBe("/api/profile-photos/photo%20avec%20espace");
  });
});
