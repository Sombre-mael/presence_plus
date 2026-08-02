import "server-only";

import { isDatabaseConnectivityError, isServerConfigurationError } from "@/lib/server-errors";

export const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
} as const;

export function apiFailure(error: unknown) {
  console.error("API request failed", error);
  const configuration = isServerConfigurationError(error);
  const database = isDatabaseConnectivityError(error);
  const status = configuration ? 500 : database ? 503 : 500;
  return Response.json(
    {
      error: configuration
        ? "Le serveur Presence Plus est incompletement configure."
        : database
          ? "Neon est temporairement indisponible."
          : "Une erreur interne a interrompu la requete.",
      code: configuration ? "SERVER_CONFIGURATION_ERROR" : database ? "DATABASE_UNAVAILABLE" : "INTERNAL_ERROR",
    },
    { status, headers: PRIVATE_RESPONSE_HEADERS },
  );
}
