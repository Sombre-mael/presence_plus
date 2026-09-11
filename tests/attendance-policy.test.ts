import { describe, expect, it } from "vitest";
import { attendancePolicyOf, DEFAULT_ATTENDANCE_POLICY } from "@/lib/attendance-policy";

describe("politique de présence", () => {
  it("utilise des valeurs produit stables sans configuration", () => {
    expect(attendancePolicyOf()).toEqual(DEFAULT_ATTENDANCE_POLICY);
  });

  it("ne remplace que les règles explicitement configurées", () => {
    expect(attendancePolicyOf({ attendanceAlertThreshold: 75 })).toEqual({
      ...DEFAULT_ATTENDANCE_POLICY,
      attendanceAlertThreshold: 75,
    });
  });
});
