export const AUTH_SESSION_TOKEN_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;
export const AUTH_SESSION_MAX_AGE_MS = AUTH_SESSION_TOKEN_MAX_AGE_SECONDS * 1_000;
export const AUTH_SESSION_IDLE_TIMEOUT_MS = 7 * 24 * 60 * 60_000;
export const AUTH_SESSION_ACTIVITY_WRITE_INTERVAL_MS = 15 * 60_000;

export function isAuthSessionIdleExpired(lastSeenAt: Date, now = new Date()) {
  return now.getTime() - lastSeenAt.getTime() >= AUTH_SESSION_IDLE_TIMEOUT_MS;
}
