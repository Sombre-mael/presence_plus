import type { UserSummary } from "@/types";

export const demoAccounts = {
  ADMIN: { id: "u1", name: "Aline Kabeya", email: "aline@presence.plus", role: "ADMIN", status: "ACTIVE" },
  TEACHER: { id: "u2", name: "Patrick Ilunga", email: "patrick@presence.plus", role: "TEACHER", status: "ACTIVE" },
  STUDENT: { id: "u4", name: "Sarah Mbuyi", email: "sarah@presence.plus", role: "STUDENT", status: "ACTIVE", promotion: "L2 Informatique" },
} satisfies Record<"ADMIN" | "TEACHER" | "STUDENT", UserSummary>;
