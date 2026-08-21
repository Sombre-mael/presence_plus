import type { DefaultSession } from "next-auth";
import type { AdminLevel, Role } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      adminLevel?: AdminLevel;
      sessionVersion: number;
      mustChangePassword: boolean;
      authSessionId: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    adminLevel?: AdminLevel;
    sessionVersion: number;
    mustChangePassword: boolean;
    authSessionId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: Role;
    adminLevel?: AdminLevel;
    sessionVersion: number;
    mustChangePassword: boolean;
    authSessionId: string;
  }
}
