import type {
  DataSubjectRequestStatus,
  DataSubjectRequestType,
  Role,
} from "@/generated/prisma/enums";

export interface LegalConfiguration {
  institutionName: string;
  institutionAddress: string;
  privacyContactEmail: string;
  privacyContactPhone?: string;
  institutionLegalDetails?: string;
  academicRetentionMonths: number;
  auditRetentionMonths: number;
}

export interface DataSubjectRequestSummary {
  id: string;
  type: DataSubjectRequestType;
  status: DataSubjectRequestStatus;
  details?: string;
  responseMessage?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  handledByName?: string;
}

export interface PrivacyInventory {
  attendanceCount: number;
  sessionCount: number;
  correctionCount: number;
  notificationCount: number;
  activeSessionCount: number;
  photoSubmissionCount: number;
  acceptanceCount: number;
}

export interface PrivacyDashboardData {
  configuration: LegalConfiguration;
  requests: DataSubjectRequestSummary[];
  inventory: PrivacyInventory;
  termsAcceptedAt?: string;
  privacyAcknowledgedAt?: string;
}

export interface AdminPrivacyRequestSummary extends DataSubjectRequestSummary {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: Role;
}
