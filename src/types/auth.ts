export type AccountAccessState =
  | "INACTIVE"
  | "INVITATION_REQUIRED"
  | "INVITATION_PENDING"
  | "INVITATION_EXPIRED"
  | "PASSWORD_CHANGE_REQUIRED"
  | "ACTIVE";

export type AuthDeliveryStatus = "NOT_APPLICABLE" | "SIMULATED" | "ACCEPTED" | "FAILED";

export interface AuthAccessCredential {
  kind: "INVITATION" | "PASSWORD_RESET";
  identifier: string;
  manualCode: string;
  expiresAt: string;
  deliveryStatus: AuthDeliveryStatus;
}

export interface AuthSessionSummary {
  id: string;
  deviceLabel: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
}

export type AuthActionResult<T = undefined> = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  value?: T;
};
