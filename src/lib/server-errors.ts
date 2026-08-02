import "server-only";

export class ServerConfigurationError extends Error {
  readonly code = "SERVER_CONFIGURATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "ServerConfigurationError";
  }
}

export class DatabaseUnavailableError extends Error {
  readonly code = "DATABASE_UNAVAILABLE";

  constructor(message = "La base de donnees est temporairement indisponible.", options?: ErrorOptions) {
    super(message, options);
    this.name = "DatabaseUnavailableError";
  }
}

export function isDatabaseUnavailableError(error: unknown): error is DatabaseUnavailableError {
  return error instanceof DatabaseUnavailableError || (
    error instanceof Error && "code" in error && error.code === "DATABASE_UNAVAILABLE"
  );
}

export function isServerConfigurationError(error: unknown): error is ServerConfigurationError {
  return error instanceof ServerConfigurationError || (
    error instanceof Error && "code" in error && error.code === "SERVER_CONFIGURATION_ERROR"
  );
}

export function isDatabaseConnectivityError(error: unknown) {
  if (isDatabaseUnavailableError(error)) return true;
  if (!(error instanceof Error)) return false;
  const code = "code" in error ? String(error.code) : "";
  return ["P1000", "P1001", "P1002", "P1017", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND"].includes(code) ||
    /can't reach database|connection (?:refused|terminated|timeout)|network socket/i.test(error.message);
}
