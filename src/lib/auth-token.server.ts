import "server-only";

import type { AuthTokenType, Prisma } from "@/generated/prisma/client";
import {
  createManualCode,
  createOpaqueToken,
  hashManualCode,
  hashOpaqueToken,
  normalizeIdentifier,
  normalizeManualCode,
} from "@/lib/auth-crypto.server";
import { prisma } from "@/lib/prisma";

type TokenDatabase = Pick<Prisma.TransactionClient, "authToken">;

const TOKEN_LIFETIME_MS: Record<AuthTokenType, number> = {
  INVITATION: 48 * 60 * 60_000,
  PASSWORD_RESET: 30 * 60_000,
};

export async function issueAuthToken(userId: string, type: AuthTokenType, database: TokenDatabase = prisma) {
  const token = createOpaqueToken();
  const manualCode = createManualCode();
  const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_MS[type]);
  await database.authToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });
  const record = await database.authToken.create({
    data: { userId, type, tokenHash: hashOpaqueToken(token), codeHash: hashManualCode(manualCode), expiresAt },
  });
  return { id: record.id, token, manualCode, expiresAt };
}

const tokenUserSelect = {
  id: true,
  name: true,
  email: true,
  matricule: true,
  passwordHash: true,
  status: true,
  activatedAt: true,
} satisfies Prisma.UserSelect;

export async function inspectAuthToken(token: string, type: AuthTokenType) {
  if (!token || token.length > 256) return null;
  return prisma.authToken.findFirst({
    where: { tokenHash: hashOpaqueToken(token), type, usedAt: null, expiresAt: { gt: new Date() } },
    select: {
      id: true,
      expiresAt: true,
      user: { select: tokenUserSelect },
    },
  });
}

export async function inspectAuthCode(identifierValue: string, codeValue: string, type: AuthTokenType) {
  const identifier = normalizeIdentifier(identifierValue);
  const code = normalizeManualCode(codeValue);
  if (!identifier || identifier.length > 160 || code.length !== 10) return null;
  return prisma.authToken.findFirst({
    where: {
      codeHash: hashManualCode(code),
      type,
      usedAt: null,
      expiresAt: { gt: new Date() },
      user: {
        OR: [
          { email: { equals: identifier, mode: "insensitive" } },
          { matricule: { equals: identifier, mode: "insensitive" } },
        ],
      },
    },
    select: { id: true, expiresAt: true, user: { select: tokenUserSelect } },
  });
}
