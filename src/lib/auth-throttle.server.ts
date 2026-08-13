import "server-only";

import type { AuthThrottleAction, Prisma } from "@/generated/prisma/client";
import { hashSensitiveKey, normalizeIdentifier } from "@/lib/auth-crypto.server";
import { prisma } from "@/lib/prisma";
import { SERIALIZABLE_TRANSACTION_OPTIONS } from "@/lib/transaction-options";
import { withDatabaseRetry, withSerializableRetry } from "@/lib/database-retry";

type ThrottleDatabase = Pick<Prisma.TransactionClient, "authThrottle">;

const POLICIES = {
  LOGIN: { pairLimit: 5, ipLimit: 25, windowMs: 15 * 60_000, blockMs: 15 * 60_000 },
  RECOVERY: { pairLimit: 3, ipLimit: 10, windowMs: 60 * 60_000, blockMs: 60 * 60_000 },
  TOKEN_VERIFY: { pairLimit: 5, ipLimit: 25, windowMs: 15 * 60_000, blockMs: 15 * 60_000 },
} satisfies Record<AuthThrottleAction, { pairLimit: number; ipLimit: number; windowMs: number; blockMs: number }>;

function keys(identifier: string, ip: string) {
  const normalized = normalizeIdentifier(identifier);
  return {
    pair: hashSensitiveKey(`pair:${normalized}:${ip}`),
    ip: hashSensitiveKey(`ip:${ip}`),
  };
}

async function activeRecord(database: ThrottleDatabase, action: AuthThrottleAction, keyHash: string, now: Date) {
  const record = await database.authThrottle.findUnique({ where: { action_keyHash: { action, keyHash } } });
  if (!record) return null;
  const policy = POLICIES[action];
  if (now.getTime() - record.windowStartedAt.getTime() >= policy.windowMs) return null;
  return record;
}

export async function isAuthThrottled(action: AuthThrottleAction, identifier: string, ip: string, now = new Date()) {
  const key = keys(identifier, ip);
  const [pair, address] = await withDatabaseRetry(() => Promise.all([
      activeRecord(prisma, action, key.pair, now),
      activeRecord(prisma, action, key.ip, now),
    ]));
  return [pair, address].some((record) => record?.blockedUntil && record.blockedUntil > now);
}

async function increment(
  database: ThrottleDatabase,
  action: AuthThrottleAction,
  keyHash: string,
  limit: number,
  now: Date,
) {
  const policy = POLICIES[action];
  const existing = await database.authThrottle.findUnique({ where: { action_keyHash: { action, keyHash } } });
  const reset = !existing || now.getTime() - existing.windowStartedAt.getTime() >= policy.windowMs;
  const attempts = reset ? 1 : existing.attempts + 1;
  const blockedUntil = attempts >= limit ? new Date(now.getTime() + policy.blockMs) : null;
  await database.authThrottle.upsert({
    where: { action_keyHash: { action, keyHash } },
    create: { action, keyHash, attempts, windowStartedAt: now, blockedUntil },
    update: { attempts, windowStartedAt: reset ? now : existing.windowStartedAt, blockedUntil },
  });
  return attempts === limit;
}

export async function registerAuthFailure(action: AuthThrottleAction, identifier: string, ip: string, now = new Date()) {
  const key = keys(identifier, ip);
  const policy = POLICIES[action];
  const justBlocked = await withSerializableRetry(() => prisma.$transaction(async (tx) => {
    const pairBlocked = await increment(tx, action, key.pair, policy.pairLimit, now);
    const ipBlocked = await increment(tx, action, key.ip, policy.ipLimit, now);
    return pairBlocked || ipBlocked;
  }, SERIALIZABLE_TRANSACTION_OPTIONS));
  if (justBlocked) {
    await prisma.auditLog.create({
      data: { actorId: null, action: "AUTH_THROTTLE_BLOCK", entityType: "AuthThrottle", entityId: action, metadata: { action } },
    }).catch(() => undefined);
  }
}

export async function consumeRecoveryAttempt(identifier: string, ip: string, now = new Date()) {
  if (await isAuthThrottled("RECOVERY", identifier, ip, now)) return false;
  await registerAuthFailure("RECOVERY", identifier, ip, now);
  return true;
}

export async function consumeTokenVerificationAttempt(identifier: string, ip: string, now = new Date()) {
  if (await isAuthThrottled("TOKEN_VERIFY", identifier, ip, now)) return false;
  await registerAuthFailure("TOKEN_VERIFY", identifier, ip, now);
  return true;
}

export async function clearLoginThrottle(identifier: string, ip: string) {
  const key = keys(identifier, ip);
  await withDatabaseRetry(() => prisma.authThrottle.deleteMany({ where: { action: "LOGIN", keyHash: key.pair } }));
}

export async function clearTokenVerificationThrottle(identifier: string, ip: string) {
  const key = keys(identifier, ip);
  await withDatabaseRetry(() => prisma.authThrottle.deleteMany({ where: { action: "TOKEN_VERIFY", keyHash: key.pair } }));
}
