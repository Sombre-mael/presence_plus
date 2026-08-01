import { beforeEach, describe, expect, it } from "vitest";
import {
  createPreviewReceipt,
  createServerQrToken,
  matchesServerQrToken,
  verifyPreviewReceipt,
} from "../src/lib/qr-token.server";

describe("server QR tokens", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret-presence-plus";
  });

  it("accepts the current and previous 30-second windows", () => {
    const now = 1_800_000;
    const current = createServerQrToken("session-1", now);
    const previous = createServerQrToken("session-1", now - 30_000);

    expect(matchesServerQrToken("session-1", current.value, now)).toBe(true);
    expect(matchesServerQrToken("session-1", previous.value, now)).toBe(true);
    expect(matchesServerQrToken("another-session", current.value, now)).toBe(false);
  });

  it("signs a preview receipt that expires after 60 seconds", () => {
    const now = 2_000_000;
    const token = createServerQrToken("session-1", now).value;
    const preview = createPreviewReceipt("session-1", "u4", token, now);

    expect(verifyPreviewReceipt("session-1", "u4", token, preview.receipt, now + 59_000)).toBe(true);
    expect(verifyPreviewReceipt("session-1", "u4", token, preview.receipt, now + 61_000)).toBe(false);
    expect(verifyPreviewReceipt("session-1", "u5", token, preview.receipt, now)).toBe(false);
  });
});
