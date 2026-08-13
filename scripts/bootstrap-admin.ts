import "dotenv/config";

import bcrypt from "bcryptjs";
import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import { disconnectPrisma, prisma } from "./prisma";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

function manualCode() {
  const raw = Array.from({ length: 10 }, () => alphabet[randomInt(alphabet.length)]).join("");
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

async function main() {
  const name = argument("name");
  const email = argument("email")?.toLocaleLowerCase("fr");
  const secret = process.env.AUTH_SECRET?.trim();
  if (!name || name.length < 2) throw new Error("Utilisez --name avec le nom complet du premier administrateur.");
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("Utilisez --email avec une adresse valide.");
  if (!secret) throw new Error("AUTH_SECRET est requis.");

  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminCount) throw new Error("Un administrateur existe déjà. La commande de bootstrap est définitivement désactivée.");

  const code = manualCode();
  const normalizedCode = code.replace(/[^A-Z0-9]/g, "");
  const opaqueToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60_000);
  const passwordHash = await bcrypt.hash(randomBytes(48).toString("base64url"), 12);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, role: "ADMIN", status: "ACTIVE", passwordHash, activatedAt: null, mustChangePassword: true },
    });
    await tx.authToken.create({
      data: {
        userId: user.id,
        type: "INVITATION",
        tokenHash: createHash("sha256").update(opaqueToken, "utf8").digest("hex"),
        codeHash: createHmac("sha256", secret).update(`auth-code:${normalizedCode}`, "utf8").digest("hex"),
        deliveryStatus: "NOT_APPLICABLE",
        expiresAt,
      },
    });
    await tx.auditLog.create({ data: { actorId: null, action: "BOOTSTRAP_ADMIN", entityType: "User", entityId: user.id } });
  });

  console.info(`Premier administrateur créé pour ${email}.`);
  console.info(`Code d’activation à usage unique : ${code}`);
  console.info(`Expiration : ${expiresAt.toISOString()}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(disconnectPrisma);
