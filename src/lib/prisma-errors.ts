import type { MutationResult } from "@/types/admin";

export function prismaMutationFailure(error: unknown, fallback: string): MutationResult {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return { ok: false, message: fallback };
  }
  const code = String(error.code);
  const meta = "meta" in error && error.meta && typeof error.meta === "object"
    ? error.meta as Record<string, unknown>
    : {};
  const target = Array.isArray(meta.target) ? meta.target.map(String) : [];
  if (code === "P2002") {
    if (target.includes("email")) return { ok: false, message: "Cette adresse e-mail est déjà utilisée.", fieldErrors: { email: "Adresse déjà utilisée." } };
    if (target.includes("matricule")) return { ok: false, message: "Ce matricule est déjà utilisé.", fieldErrors: { matricule: "Matricule déjà utilisé." } };
    if (target.includes("code")) return { ok: false, message: "Ce code de cours est déjà utilisé.", fieldErrors: { code: "Code déjà utilisé." } };
    if (target.includes("name")) return { ok: false, message: "Ce nom est déjà utilisé.", fieldErrors: { name: "Nom déjà utilisé." } };
    return { ok: false, message: "Une donnée identique existe déjà." };
  }
  if (code === "P2003") return { ok: false, message: "Cette opération est bloquée par des données historiques liées." };
  if (code === "P2025") return { ok: false, message: "Cet élément n’existe plus. Rechargez les données." };
  if (code === "P2034") return { ok: false, message: "Les données ont changé simultanément. Rechargez puis réessayez." };
  return { ok: false, message: fallback };
}
