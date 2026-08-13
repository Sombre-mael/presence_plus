import { describe, expect, it } from "vitest";
import { roleHome, safeCallbackUrl } from "@/lib/auth-navigation";

describe("auth navigation", () => {
  it("redirige chaque rôle vers son espace", () => {
    expect(roleHome("ADMIN")).toBe("/admin/dashboard");
    expect(roleHome("TEACHER")).toBe("/teacher/dashboard");
    expect(roleHome("STUDENT")).toBe("/student/dashboard");
  });

  it("refuse les redirections ouvertes", () => {
    expect(safeCallbackUrl("https://evil.example")).toBe("/dashboard");
    expect(safeCallbackUrl("//evil.example")).toBe("/dashboard");
    expect(safeCallbackUrl("/\\evil.example")).toBe("/dashboard");
    expect(safeCallbackUrl("/%2F%2Fevil.example")).toBe("/dashboard");
    expect(safeCallbackUrl("/%E0%A4%A")).toBe("/dashboard");
    expect(safeCallbackUrl("/student/history")).toBe("/student/history");
  });
});
