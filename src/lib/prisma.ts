

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,                 // driver adapter pour PostgreSQL, qui va permettre à Prisma de se connecter à la base de données PostgreSQL
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}