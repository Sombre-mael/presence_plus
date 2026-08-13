

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { databaseUrl } from "@/lib/env.server";

const globalForPrisma = globalThis as {
  pool?: Pool;
  prisma?: PrismaClient;
};

const pool = globalForPrisma.pool ?? new Pool({
  connectionString: databaseUrl(),
  connectionTimeoutMillis: 30_000,
  idleTimeoutMillis: 60_000,
  keepAlive: true,
  max: 5,
  query_timeout: 30_000,
  statement_timeout: 30_000,
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,                 // driver adapter pour PostgreSQL, qui va permettre à Prisma de se connecter à la base de données PostgreSQL
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
  globalForPrisma.prisma = prisma;
}
