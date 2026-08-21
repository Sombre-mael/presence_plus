import type { AdminLevel, AvatarColor, Role, UserStatus } from "@/types";

export type ProfilePhotoStatus = "PENDING" | "APPROVED" | "REJECTED" | "REPLACED" | "CANCELLED";
export type AccountPhotoVerificationStatus = "MISSING" | "PENDING" | "APPROVED" | "REJECTED";

export interface AccountPhotoState {
  status: AccountPhotoVerificationStatus;
  approvedPhotoUrl?: string;
  pendingSubmittedAt?: string;
  reviewedAt?: string;
  reviewReason?: string;
  enforcementAt: string;
  requiredNow: boolean;
}

export interface ProfilePhotoReviewSummary {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: Role;
  status: ProfilePhotoStatus;
  photoUrl: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedByName?: string;
  reviewReason?: string;
}

export const ACCOUNT_AVATAR_COLORS = ["EMERALD", "BLUE", "AMBER", "ROSE", "SLATE"] as const;
export type AccountAvatarColor = AvatarColor;

export interface AccountPersonalization {
  preferredName?: string;
  phone?: string;
  avatarUrl?: string;
  avatarColor: AccountAvatarColor;
}

export interface AccountAvatarMutationValue {
  avatarUrl?: string;
  photoState?: AccountPhotoState;
}

export interface AccountProfileUpdateInput {
  preferredName: string;
  phone: string;
  avatarColor: AccountAvatarColor;
}

export interface AccountCourseAssignment {
  id: string;
  code: string;
  name: string;
  active: boolean;
  weeklyHours: number;
  promotion: string;
}

export interface AccountPromotion {
  id: string;
  name: string;
  department: string;
  academicYear: string;
}

export interface AccountProfile extends AccountPersonalization {
  id: string;
  name: string;
  email: string;
  role: Role;
  adminLevel?: AdminLevel;
  status: UserStatus;
  photo: AccountPhotoState;
  matricule?: string;
  promotion?: AccountPromotion;
  courses: AccountCourseAssignment[];
  createdAt: string;
  activatedAt?: string;
  lastLoginAt?: string;
}
