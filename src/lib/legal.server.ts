import "server-only";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_LEGAL_CONFIGURATION,
  PRIVACY_VERSION,
  TERMS_VERSION,
  hasCurrentLegalAcceptance,
} from "@/lib/legal-policy";
import type { LegalConfiguration } from "@/types/privacy";

export async function getLegalConfiguration(): Promise<LegalConfiguration> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { id: "default" },
      select: {
        institutionName: true,
        institutionAddress: true,
        privacyContactEmail: true,
        privacyContactPhone: true,
        institutionLegalDetails: true,
        academicRetentionMonths: true,
        auditRetentionMonths: true,
      },
    });
    if (!setting) return { ...DEFAULT_LEGAL_CONFIGURATION };
    return {
      institutionName: setting.institutionName,
      institutionAddress: setting.institutionAddress,
      privacyContactEmail: setting.privacyContactEmail,
      privacyContactPhone: setting.privacyContactPhone ?? undefined,
      institutionLegalDetails: setting.institutionLegalDetails ?? undefined,
      academicRetentionMonths: setting.academicRetentionMonths,
      auditRetentionMonths: setting.auditRetentionMonths,
    };
  } catch {
    return { ...DEFAULT_LEGAL_CONFIGURATION };
  }
}

export async function getLegalAcceptanceState(userId: string) {
  const acceptances = await prisma.legalAcceptance.findMany({
    where: {
      userId,
      OR: [
        { documentType: "TERMS", version: TERMS_VERSION },
        { documentType: "PRIVACY_NOTICE", version: PRIVACY_VERSION },
      ],
    },
    select: { documentType: true, version: true, acceptedAt: true },
  });
  return {
    ...hasCurrentLegalAcceptance(acceptances),
    termsAcceptedAt: acceptances.find((item) => item.documentType === "TERMS")?.acceptedAt,
    privacyAcknowledgedAt: acceptances.find((item) => item.documentType === "PRIVACY_NOTICE")?.acceptedAt,
  };
}
