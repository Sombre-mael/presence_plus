import type { AdminLevel, DataSubjectRequestStatus, DataSubjectRequestType } from "@/generated/prisma/enums";

export function isActivePrivacyRequest(status: DataSubjectRequestStatus) {
  return status === "PENDING" || status === "IN_REVIEW";
}

export function canCancelPrivacyRequest(status: DataSubjectRequestStatus) {
  return status === "PENDING";
}

export function canAdminProcessPrivacyRequest(type: DataSubjectRequestType, adminLevel?: AdminLevel) {
  if (type === "OBJECTION" || type === "DELETION") return adminLevel === "SUPER";
  return true;
}
