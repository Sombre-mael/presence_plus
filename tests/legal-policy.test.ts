import { describe, expect, it } from "vitest";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
  hasCurrentLegalAcceptance,
  monthsBefore,
} from "@/lib/legal-policy";

describe("versions juridiques", () => {
  it("exige séparément les conditions et la politique de confidentialité", () => {
    expect(hasCurrentLegalAcceptance([{ documentType: "TERMS", version: TERMS_VERSION }])).toEqual({
      termsAccepted: true,
      privacyAcknowledged: false,
      complete: false,
    });
    expect(hasCurrentLegalAcceptance([
      { documentType: "TERMS", version: TERMS_VERSION },
      { documentType: "PRIVACY_NOTICE", version: PRIVACY_VERSION },
    ]).complete).toBe(true);
  });

  it("ignore une ancienne version", () => {
    expect(hasCurrentLegalAcceptance([
      { documentType: "TERMS", version: "ancienne" },
      { documentType: "PRIVACY_NOTICE", version: PRIVACY_VERSION },
    ]).complete).toBe(false);
  });

  it("calcule les seuils de conservation en mois UTC", () => {
    expect(monthsBefore(new Date("2026-09-23T12:00:00.000Z"), 24).toISOString()).toBe("2024-09-23T12:00:00.000Z");
  });
});
