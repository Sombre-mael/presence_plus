import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { databaseUrl } from "@/lib/env.server";

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg({
  connectionString: databaseUrl(),
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 60_000,
  keepAlive: true,
  max: 5,
  query_timeout: 30_000,
  statement_timeout: 30_000,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  transactionOptions: { maxWait: 15_000, timeout: 30_000 },
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
