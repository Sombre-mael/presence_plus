import { createHmac, timingSafeEqual } from "node:crypto";
import { QR_PREVIEW_MS, QR_ROTATION_MS } from "@/lib/qr-constants";

type CheckInSource = "QR" | "STUDENT_CODE";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET est requis pour les codes de pointage.");
  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function secureEqual(first: string, second: string) {
  const left = Buffer.from(first);
  const right = Buffer.from(second);
  return left.length === right.length && timingSafeEqual(left, right);
}

function tokenForWindow(sessionId: string, window: number) {
  return sign(`qr:${sessionId}:${window}`).slice(0, 8).toUpperCase();
}

export function createServerQrToken(sessionId: string, now = Date.now()) {
  const window = Math.floor(now / QR_ROTATION_MS);
  const expiresAt = (window + 1) * QR_ROTATION_MS;
  return { value: tokenForWindow(sessionId, window), expiresAt };
}

export function matchesServerQrToken(sessionId: string, token: string, now = Date.now()) {
  const window = Math.floor(now / QR_ROTATION_MS);
  return [window, window - 1].some((candidate) =>
    secureEqual(tokenForWindow(sessionId, candidate), token.trim().toUpperCase()),
  );
}

export function createPreviewReceipt(
  sessionId: string,
  studentId: string,
  token: string,
  source: CheckInSource,
  now = Date.now(),
) {
  const expiresAt = now + QR_PREVIEW_MS;
  const signature = sign(`preview:${sessionId}:${studentId}:${token}:${source}:${expiresAt}`);
  return { expiresAt, receipt: `${expiresAt}.${signature}` };
}

export function verifyPreviewReceipt(
  sessionId: string,
  studentId: string,
  token: string,
  source: CheckInSource,
  receipt: string,
  now = Date.now(),
) {
  const [expiresAtRaw, signature] = receipt.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!signature || !Number.isFinite(expiresAt) || expiresAt < now) return false;
  return secureEqual(sign(`preview:${sessionId}:${studentId}:${token}:${source}:${expiresAt}`), signature);
}
