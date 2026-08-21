import { describe, expect, it } from "vitest";
import { accountProfileUpdateSchema, profileFieldErrors } from "@/lib/profile-domain";

describe("personnalisation du profil", () => {
  it("accepte un prénom accentué et un numéro congolais lisible", () => {
    const result = accountProfileUpdateSchema.safeParse({
      preferredName: "Maël d'Arc",
      phone: "+243 999 000 000",
      avatarColor: "BLUE",
    });

    expect(result.success).toBe(true);
  });

  it("autorise la suppression des informations facultatives", () => {
    const result = accountProfileUpdateSchema.safeParse({
      preferredName: "",
      phone: "",
      avatarColor: "EMERALD",
    });

    expect(result.success).toBe(true);
  });

  it("retourne des erreurs ciblées pour les valeurs invalides", () => {
    const result = accountProfileUpdateSchema.safeParse({
      preferredName: "Profil <script>",
      phone: "appelez-moi",
      avatarColor: "PURPLE",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(profileFieldErrors(result.error)).toMatchObject({
      preferredName: expect.any(String),
      phone: expect.any(String),
      avatarColor: expect.any(String),
    });
  });
});
