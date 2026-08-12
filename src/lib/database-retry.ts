import "server-only";

function isTransientDatabaseError(error: unknown) {
  let current = error;

  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    const code = "code" in current ? String(current.code) : "";
    const message = "message" in current ? String(current.message) : "";

    if (
      ["ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"].includes(code)
      || /can't reach database|connection terminated|connection timeout|server closed the connection/i.test(message)
    ) {
      return true;
    }

    current = "cause" in current ? current.cause : undefined;
  }

  return false;
}

export async function withDatabaseRetry<T>(operation: () => Promise<T>, attempts = 3) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientDatabaseError(error) || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }

  throw lastError;
}
