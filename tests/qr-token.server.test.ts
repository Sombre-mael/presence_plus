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

  it("accepts the current and previous 10-second windows", () => {
    const now = 1_800_000;
    const current = createServerQrToken("session-1", now);
    const previous = createServerQrToken("session-1", now - 10_000);

    expect(matchesServerQrToken("session-1", current.value, now)).toBe(true);
    expect(matchesServerQrToken("session-1", previous.value, now)).toBe(true);
    expect(matchesServerQrToken("another-session", current.value, now)).toBe(false);
  });

  it("rotates the pointage code every 10 seconds", () => {
    const first = createServerQrToken("session-1", 20_000);
    const sameWindow = createServerQrToken("session-1", 29_999);
    const nextWindow = createServerQrToken("session-1", 30_000);

    expect(first.value).toBe(sameWindow.value);
    expect(first.expiresAt).toBe(30_000);
    expect(nextWindow.value).not.toBe(first.value);
  });

  it("signs a preview receipt that expires after 60 seconds", () => {
    const now = 2_000_000;
    const token = createServerQrToken("session-1", now).value;
    const preview = createPreviewReceipt("session-1", "u4", token, "QR", now);

    expect(verifyPreviewReceipt("session-1", "u4", token, "QR", preview.receipt, now + 59_000)).toBe(true);
    expect(verifyPreviewReceipt("session-1", "u4", token, "QR", preview.receipt, now + 61_000)).toBe(false);
    expect(verifyPreviewReceipt("session-1", "u5", token, "QR", preview.receipt, now)).toBe(false);
    expect(verifyPreviewReceipt("session-1", "u4", token, "STUDENT_CODE", preview.receipt, now)).toBe(false);
  });
});
