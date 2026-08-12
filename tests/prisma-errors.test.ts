import { describe, expect, it } from "vitest";
import { prismaMutationFailure } from "@/lib/prisma-errors";

describe("erreurs Prisma métier", () => {
  it("associe les violations uniques au champ concerné", () => {
    expect(prismaMutationFailure({ code: "P2002", meta: { target: ["email"] } }, "Erreur")).toEqual({
      ok: false,
      message: "Cette adresse e-mail est déjà utilisée.",
      fieldErrors: { email: "Adresse déjà utilisée." },
    });
  });

  it("traduit les dépendances, absences et conflits concurrents", () => {
    expect(prismaMutationFailure({ code: "P2003" }, "Erreur").message).toMatch(/données historiques/);
    expect(prismaMutationFailure({ code: "P2025" }, "Erreur").message).toMatch(/n’existe plus/);
    expect(prismaMutationFailure({ code: "P2034" }, "Erreur").message).toMatch(/simultanément/);
  });

  it("conserve un message sûr pour une erreur inconnue", () => {
    expect(prismaMutationFailure(new Error("secret"), "Opération impossible.")).toEqual({
      ok: false,
      message: "Opération impossible.",
    });
  });
});
