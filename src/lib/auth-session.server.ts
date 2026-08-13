import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { hashSensitiveKey } from "@/lib/auth-crypto.server";
import { withDatabaseRetry } from "@/lib/database-retry";
import { prisma } from "@/lib/prisma";
import type { AuthSessionSummary } from "@/types/auth";

type SessionDatabase = Pick<Prisma.TransactionClient, "authSession">;

export const AUTH_SESSION_MAX_AGE_MS = 8 * 60 * 60_000;
const ACTIVITY_WRITE_INTERVAL_MS = 15 * 60_000;

function headerValue(source: Headers | Record<string, string | string[] | undefined> | undefined, name: string) {
  if (!source) return null;
  if (source instanceof Headers) return source.get(name);
  const value = source[name] ?? source[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value ?? null;
}

export function authSessionRequestMetadata(headers: Headers | Record<string, string | string[] | undefined> | undefined, ip: string) {
  return {
    userAgent: headerValue(headers, "user-agent")?.slice(0, 500) || null,
    ipHash: hashSensitiveKey(`auth-session-ip:${ip}`),
  };
}

export async function createAuthSession(
  database: SessionDatabase,
  userId: string,
  headers: Headers | Record<string, string | string[] | undefined> | undefined,
  ip: string,
  now = new Date(),
  id?: string,
) {
  const metadata = authSessionRequestMetadata(headers, ip);
  return database.authSession.create({
    data: { ...(id ? { id } : {}), userId, ...metadata, createdAt: now, lastSeenAt: now, expiresAt: new Date(now.getTime() + AUTH_SESSION_MAX_AGE_MS) },
  });
}

export async function validateAuthSession(id: string, userId: string, now = new Date()) {
  const session = await withDatabaseRetry(() => prisma.authSession.findFirst({
    where: { id, userId, revokedAt: null, expiresAt: { gt: now } },
    select: { lastSeenAt: true },
  }));
  if (!session) return false;
  if (now.getTime() - session.lastSeenAt.getTime() >= ACTIVITY_WRITE_INTERVAL_MS) {
    await withDatabaseRetry(() => prisma.authSession.updateMany({
      where: { id, userId, revokedAt: null, expiresAt: { gt: now }, lastSeenAt: { lt: new Date(now.getTime() - ACTIVITY_WRITE_INTERVAL_MS) } },
      data: { lastSeenAt: now },
    }));
  }
  return true;
}

export async function revokeAuthSessions(
  database: SessionDatabase,
  userId: string,
  reason: string,
  exceptId?: string,
  now = new Date(),
) {
  return database.authSession.updateMany({
    where: { userId, revokedAt: null, expiresAt: { gt: now }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    data: { revokedAt: now, revokedReason: reason },
  });
}

function deviceLabel(userAgent: string | null) {
  if (!userAgent) return "Navigateur non identifié";
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Firefox\//.test(userAgent) ? "Firefox" : /Chrome\//.test(userAgent) ? "Chrome" : /Safari\//.test(userAgent) ? "Safari" : "Navigateur web";
  const device = /Android/.test(userAgent) ? "Android" : /iPhone|iPad/.test(userAgent) ? "iPhone ou iPad" : /Windows/.test(userAgent) ? "Windows" : /Mac OS/.test(userAgent) ? "macOS" : /Linux/.test(userAgent) ? "Linux" : "appareil inconnu";
  return `${browser} sur ${device}`;
}

export async function listActiveAuthSessions(userId: string, currentId: string, now = new Date()): Promise<AuthSessionSummary[]> {
  const sessions = await withDatabaseRetry(() => prisma.authSession.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: now } },
    orderBy: { lastSeenAt: "desc" },
  }));
  return sessions.map((session) => ({
    id: session.id,
    deviceLabel: deviceLabel(session.userAgent),
    createdAt: session.createdAt.toISOString(),
    lastSeenAt: session.lastSeenAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    current: session.id === currentId,
  }));
}
