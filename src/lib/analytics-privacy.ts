const PRIVATE_PREFIXES = [
  "/admin",
  "/teacher",
  "/student",
  "/account",
  "/change-password",
  "/activate-account",
  "/reset-password",
  "/forgot-password",
  "/api",
];

const SENSITIVE_QUERY_KEYS = ["token", "code", "email", "matricule", "callbackUrl"];

export function isPublicTelemetryUrl(value: string, origin = "https://presence-plus.example") {
  try {
    const url = new URL(value, origin);
    if (SENSITIVE_QUERY_KEYS.some((key) => url.searchParams.has(key))) return false;
    return !PRIVATE_PREFIXES.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`));
  } catch {
    return false;
  }
}
