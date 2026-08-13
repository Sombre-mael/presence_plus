import "dotenv/config";

import { disconnectPrisma, prisma } from "./prisma";

async function retry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw lastError;
}

async function main() {
  const now = new Date();
  const tokenCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60_000);
  const throttleCutoff = new Date(now.getTime() - 48 * 60 * 60_000);
  const sessionCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60_000);

  const tokens = await retry(() => prisma.authToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: tokenCutoff } }, { usedAt: { lt: tokenCutoff } }] },
  }));
  const throttles = await retry(() => prisma.authThrottle.deleteMany({
    where: { updatedAt: { lt: throttleCutoff } },
  }));
  const sessions = await retry(() => prisma.authSession.deleteMany({
    where: { OR: [{ expiresAt: { lt: sessionCutoff } }, { revokedAt: { lt: sessionCutoff } }] },
  }));

  console.info(`Nettoyage Auth termine : ${tokens.count} jeton(s), ${throttles.count} limitation(s), ${sessions.count} session(s).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(disconnectPrisma);
