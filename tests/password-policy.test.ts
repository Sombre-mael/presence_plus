import { describe, expect, it } from "vitest";
import { evaluatePassword } from "@/lib/password-policy";

describe("password policy", () => {
  it("refuse les mots de passe trop courts et faciles à deviner", () => {
    const result = evaluatePassword("password");
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("12 caractères");
  });

  it("refuse les fragments évidents de l'identité", () => {
    const result = evaluatePassword("Sarah-Mbuyi-2026!", ["Sarah Mbuyi", "sarah@presence.plus"]);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("nom, e-mail ou matricule");
  });

  it("accepte une phrase de passe robuste dans les limites bcrypt", () => {
    const result = evaluatePassword("Quartz!Noyau7-Cobalt-Rivage");
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  it("accepte une phrase mémorisable sans règle de composition", () => {
    const result = evaluatePassword("J aime apprendre");
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(2);
  });

  it("refuse un mot de passe courant même lorsqu'il est assez long", () => {
    const result = evaluatePassword("motdepasse2026");
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("mots de passe courants");
  });

  it("refuse plus de 72 octets même sous 64 caractères Unicode", () => {
    const result = evaluatePassword("é".repeat(40) + "Quartz!7");
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("72 octets");
  });
});
