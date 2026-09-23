export const LEGAL_EFFECTIVE_DATE = "2026-09-23";
export const TERMS_VERSION = "2026.09";
export const PRIVACY_VERSION = "2026.09";

export const DEFAULT_LEGAL_CONFIGURATION = {
  institutionName: "Établissement utilisateur de Presence Plus",
  institutionAddress: "",
  privacyContactEmail: "presenceplus12@gmail.com",
  privacyContactPhone: undefined,
  institutionLegalDetails: undefined,
  academicRetentionMonths: 60,
  auditRetentionMonths: 24,
} as const;

export const FIXED_RETENTION = {
  readNotificationsDays: 90,
  authSessionsDays: 30,
  authThrottlesHours: 48,
  authTokensDays: 7,
  abandonedPhotoDays: 30,
  revokedPushDays: 30,
} as const;

export function hasCurrentLegalAcceptance(
  acceptances: Array<{ documentType: "TERMS" | "PRIVACY_NOTICE"; version: string }>,
) {
  const termsAccepted = acceptances.some(
    (item) => item.documentType === "TERMS" && item.version === TERMS_VERSION,
  );
  const privacyAcknowledged = acceptances.some(
    (item) => item.documentType === "PRIVACY_NOTICE" && item.version === PRIVACY_VERSION,
  );
  return { termsAccepted, privacyAcknowledged, complete: termsAccepted && privacyAcknowledged };
}

export function monthsBefore(date: Date, months: number) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() - months);
  return result;
}
