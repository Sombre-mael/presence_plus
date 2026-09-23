import { describe, expect, it } from "vitest";
import { isPublicTelemetryUrl } from "@/lib/analytics-privacy";
import {
  canAdminProcessPrivacyRequest,
  canCancelPrivacyRequest,
  isActivePrivacyRequest,
} from "@/lib/privacy-domain";

describe("confidentialité produit", () => {
  it("exclut les espaces privés et les URL contenant des secrets de la télémétrie", () => {
    expect(isPublicTelemetryUrl("/legal/privacy")).toBe(true);
    expect(isPublicTelemetryUrl("/admin/dashboard")).toBe(false);
    expect(isPublicTelemetryUrl("/activate-account?token=secret")).toBe(false);
    expect(isPublicTelemetryUrl("/login?callbackUrl=%2Fstudent%2Fdashboard")).toBe(false);
  });

  it("réserve suppression et opposition au super administrateur", () => {
    expect(canAdminProcessPrivacyRequest("ACCESS", "STANDARD")).toBe(true);
    expect(canAdminProcessPrivacyRequest("DELETION", "STANDARD")).toBe(false);
    expect(canAdminProcessPrivacyRequest("OBJECTION", "SUPER")).toBe(true);
  });

  it("autorise l’annulation uniquement avant la prise en charge", () => {
    expect(isActivePrivacyRequest("PENDING")).toBe(true);
    expect(isActivePrivacyRequest("IN_REVIEW")).toBe(true);
    expect(canCancelPrivacyRequest("PENDING")).toBe(true);
    expect(canCancelPrivacyRequest("IN_REVIEW")).toBe(false);
  });
});
