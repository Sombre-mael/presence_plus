import "server-only";

import type { AuthThrottleAction, Prisma } from "@/generated/prisma/client";
import { hashSensitiveKey, normalizeIdentifier } from "@/lib/auth-crypto.server";
import { prisma } from "@/lib/prisma";
import { SERIALIZABLE_TRANSACTION_OPTIONS } from "@/lib/transaction-options";

type ThrottleDatabase = Pick<Prisma.TransactionClient, "authThrottle">;

const POLICIES = {
  LOGIN: { pairLimit: 5, ipLimit: 25, windowMs: 15 * 60_000, blockMs: 15 * 60_000 },
  RECOVERY: { pairLimit: 3, ipLimit: 10, windowMs: 60 * 60_000, blockMs: 60 * 60_000 },
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
  const [pair, address] = await Promise.all([
    activeRecord(prisma, action, key.pair, now),
    activeRecord(prisma, action, key.ip, now),
  ]);
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
}

export async function registerAuthFailure(action: AuthThrottleAction, identifier: string, ip: string, now = new Date()) {
  const key = keys(identifier, ip);
  const policy = POLICIES[action];
  await prisma.$transaction(async (tx) => {
    await increment(tx, action, key.pair, policy.pairLimit, now);
    await increment(tx, action, key.ip, policy.ipLimit, now);
  }, SERIALIZABLE_TRANSACTION_OPTIONS);
}

export async function consumeRecoveryAttempt(identifier: string, ip: string, now = new Date()) {
  if (await isAuthThrottled("RECOVERY", identifier, ip, now)) return false;
  await registerAuthFailure("RECOVERY", identifier, ip, now);
  return true;
}

export async function clearLoginThrottle(identifier: string, ip: string) {
  const key = keys(identifier, ip);
  await prisma.authThrottle.deleteMany({ where: { action: "LOGIN", keyHash: key.pair } });
}
