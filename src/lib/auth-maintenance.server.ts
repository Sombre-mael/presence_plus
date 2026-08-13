import "server-only";

import { prisma } from "@/lib/prisma";
import { withDatabaseRetry } from "@/lib/database-retry";

export async function cleanExpiredAuthData(now = new Date()) {
  const tokenCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60_000);
  const throttleCutoff = new Date(now.getTime() - 48 * 60 * 60_000);
  const sessionCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60_000);
  const tokens = await withDatabaseRetry(() => prisma.authToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: tokenCutoff } }, { usedAt: { lt: tokenCutoff } }] },
    }));
  const throttles = await withDatabaseRetry(() => prisma.authThrottle.deleteMany({ where: { updatedAt: { lt: throttleCutoff } } }));
  const sessions = await withDatabaseRetry(() => prisma.authSession.deleteMany({
      where: { OR: [{ expiresAt: { lt: sessionCutoff } }, { revokedAt: { lt: sessionCutoff } }] },
    }));
  return { tokens: tokens.count, throttles: throttles.count, sessions: sessions.count };
}
