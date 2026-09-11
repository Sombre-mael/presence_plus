import type { SessionStatus } from "@/types";

export const SESSION_START_EARLY_WINDOW_MS = 30 * 60_000;

export function isWithinSessionStartWindow(
  scheduledStartAt: Date,
  scheduledEndAt: Date,
  now = new Date(),
  earlyWindowMs = SESSION_START_EARLY_WINDOW_MS,
) {
  return now >= new Date(scheduledStartAt.getTime() - earlyWindowMs)
    && now <= scheduledEndAt;
}

export function shouldAutoCancelSession(
  status: SessionStatus,
  scheduledEndAt: Date,
  now = new Date(),
) {
  return status === "SCHEDULED" && scheduledEndAt < now;
}
