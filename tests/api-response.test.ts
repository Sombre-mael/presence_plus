import { describe, expect, it } from "vitest";
import { PRIVATE_RESPONSE_HEADERS, apiFailure } from "@/lib/api-response";

describe("réponses API privées", () => {
  it("interdit toute mise en cache personnelle", () => {
    expect(PRIVATE_RESPONSE_HEADERS["Cache-Control"]).toContain("private");
    expect(PRIVATE_RESPONSE_HEADERS["Cache-Control"]).toContain("no-store");
  });

  it("distingue une panne Neon d’une erreur applicative", async () => {
    const unavailable = apiFailure(new Error("Can't reach database server"));
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get("Cache-Control")).toContain("no-store");
    expect(await unavailable.json()).toMatchObject({ error: expect.any(String) });
  });
});
