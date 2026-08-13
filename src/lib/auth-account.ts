import type { AccountAccessState } from "@/types/auth";

interface AccountStateInput {
  status: "ACTIVE" | "INACTIVE";
  activatedAt: Date | null;
  mustChangePassword: boolean;
  invitation?: { usedAt: Date | null; expiresAt: Date } | null;
  now?: Date;
}

export function accountAccessState({ status, activatedAt, mustChangePassword, invitation, now = new Date() }: AccountStateInput): AccountAccessState {
  if (status === "INACTIVE") return "INACTIVE";
  if (activatedAt) return mustChangePassword ? "PASSWORD_CHANGE_REQUIRED" : "ACTIVE";
  if (!invitation || invitation.usedAt) return "INVITATION_REQUIRED";
  return invitation.expiresAt > now ? "INVITATION_PENDING" : "INVITATION_EXPIRED";
}
