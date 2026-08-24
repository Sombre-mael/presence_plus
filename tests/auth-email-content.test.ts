import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAuthEmailContent } from "@/lib/auth-email.server";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

describe("auth email content", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ["INVITATION", "48 heures", "/activate-account?token="],
    ["PASSWORD_RESET", "30 minutes", "/reset-password?token="],
  ] as const)("inclut le code manuel pour %s", (type, expiry, path) => {
    vi.stubEnv("NEXTAUTH_URL", "https://presence-plus.example");

    const content = buildAuthEmailContent(
      { email: "user@example.test", name: "Maël <Kahilu>" },
      type,
      "secret-token",
      "ABCD-1234",
    );

    expect(content.text).toContain("Code à usage unique : ABCD-1234");
    expect(content.text).toContain(expiry);
    expect(content.text).toContain(`https://presence-plus.example${path}secret-token`);
    expect(content.html).toContain("ABCD-1234");
    expect(content.html).toContain("Maël &lt;Kahilu&gt;");
    expect(content.html).not.toContain("Maël <Kahilu>");
  });
});
