import type { AccountPhotoState, AccountPhotoVerificationStatus } from "@/types/account";

export function profilePhotoUrl(id: string) {
  return `/api/profile-photos/${encodeURIComponent(id)}`;
}

export function profilePhotoVerificationStatus(input: {
  approved: boolean;
  pending: boolean;
  rejected: boolean;
}): AccountPhotoVerificationStatus {
  if (input.pending) return "PENDING";
  if (input.approved) return "APPROVED";
  if (input.rejected) return "REJECTED";
  return "MISSING";
}

export function buildAccountPhotoState(input: {
  approvedId?: string;
  pendingSubmittedAt?: Date;
  latestRejectedAt?: Date;
  reviewReason?: string;
  enforcementAt: Date;
  now?: Date;
}): AccountPhotoState {
  const now = input.now ?? new Date();
  const status = profilePhotoVerificationStatus({
    approved: Boolean(input.approvedId),
    pending: Boolean(input.pendingSubmittedAt),
    rejected: Boolean(input.latestRejectedAt),
  });
  return {
    status,
    ...(input.approvedId ? { approvedPhotoUrl: profilePhotoUrl(input.approvedId) } : {}),
    ...(input.pendingSubmittedAt ? { pendingSubmittedAt: input.pendingSubmittedAt.toISOString() } : {}),
    ...(input.latestRejectedAt ? { reviewedAt: input.latestRejectedAt.toISOString() } : {}),
    ...(input.reviewReason ? { reviewReason: input.reviewReason } : {}),
    enforcementAt: input.enforcementAt.toISOString(),
    requiredNow: !input.approvedId && now >= input.enforcementAt,
  };
}

export function profilePhotoGraceDays(enforcementAt: string, now = new Date()) {
  return Math.max(0, Math.ceil((new Date(enforcementAt).getTime() - now.getTime()) / 86_400_000));
}
