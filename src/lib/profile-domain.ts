import { z } from "zod";
import { ACCOUNT_AVATAR_COLORS } from "@/types/account";

const preferredName = z.string()
  .trim()
  .max(60, "Le prénom d’usage ne peut pas dépasser 60 caractères.")
  .refine((value) => !value || value.length >= 2, "Saisissez au moins 2 caractères.")
  .refine(
    (value) => !value || /^[\p{L}\p{M}'’ -]+$/u.test(value),
    "Utilisez uniquement des lettres, espaces, apostrophes ou traits d’union.",
  );

const phone = z.string()
  .trim()
  .max(24, "Le numéro ne peut pas dépasser 24 caractères.")
  .refine(
    (value) => !value || (/^[+()\d\s.-]+$/.test(value) && value.replace(/\D/g, "").length >= 7),
    "Saisissez un numéro de téléphone valide.",
  );

export const accountProfileUpdateSchema = z.object({
  preferredName,
  phone,
  avatarColor: z.enum(ACCOUNT_AVATAR_COLORS),
});

export function profileFieldErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}
