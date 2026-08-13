import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "../src/generated/prisma/client";

const rawDatabaseUrl = process.env.DATABASE_URL?.trim();

if (!rawDatabaseUrl) {
  throw new Error("DATABASE_URL est requise.");
}

const databaseUrl = new URL(rawDatabaseUrl);
if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
  throw new Error("DATABASE_URL doit utiliser le protocole PostgreSQL.");
}
if (["prefer", "require", "verify-ca"].includes(databaseUrl.searchParams.get("sslmode") ?? "")) {
  databaseUrl.searchParams.set("sslmode", "verify-full");
}

const pool = new Pool({
  connectionString: databaseUrl.toString(),
  connectionTimeoutMillis: 30_000,
  idleTimeoutMillis: 60_000,
  keepAlive: true,
  max: 2,
  query_timeout: 30_000,
  statement_timeout: 30_000,
});

export const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

export async function disconnectPrisma() {
  await prisma.$disconnect();
  await pool.end();
}
