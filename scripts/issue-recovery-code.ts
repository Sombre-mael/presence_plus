import "dotenv/config";

import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";

import { disconnectPrisma, prisma } from "./prisma";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

function manualCode() {
  const raw = Array.from({ length: 10 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  return { raw, display: `${raw.slice(0, 5)}-${raw.slice(5)}` };
}

async function main() {
  const identifier = argument("identifier")?.toLocaleLowerCase("fr");
  const secret = process.env.AUTH_SECRET?.trim();
  if (!identifier) throw new Error("Utilisez --identifier avec l’e-mail ou le matricule du compte.");
  if (!secret) throw new Error("AUTH_SECRET est requis.");

  const user = await prisma.user.findFirst({
    where: {
      status: "ACTIVE",
      OR: [
        { email: { equals: identifier, mode: "insensitive" } },
        { matricule: { equals: identifier, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
  });
  if (!user) throw new Error("Aucun compte actif ne correspond à cet identifiant.");

  const code = manualCode();
  const opaqueToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 60_000);

  await prisma.$transaction(async (tx) => {
    await tx.authToken.updateMany({
      where: { userId: user.id, type: "PASSWORD_RESET", usedAt: null },
      data: { usedAt: new Date() },
    });
    const token = await tx.authToken.create({
      data: {
        userId: user.id,
        type: "PASSWORD_RESET",
        tokenHash: createHash("sha256").update(opaqueToken, "utf8").digest("hex"),
        codeHash: createHmac("sha256", secret).update(`auth-code:${code.raw}`, "utf8").digest("hex"),
        deliveryStatus: "NOT_APPLICABLE",
        expiresAt,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: null,
        action: "OPERATOR_PASSWORD_RESET_CODE",
        entityType: "AuthToken",
        entityId: token.id,
        metadata: { userId: user.id },
      },
    });
  });

  console.info(`Code de récupération créé pour ${user.name}.`);
  console.info(`Code à usage unique : ${code.display}`);
  console.info(`Expiration : ${expiresAt.toISOString()}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(disconnectPrisma);
