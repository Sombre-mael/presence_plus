import "server-only";

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { z } from "zod";
import { authSecret } from "@/lib/env.server";
import { clientIpFromHeaders } from "@/lib/auth-request.server";
import { clearLoginThrottle, isAuthThrottled, registerAuthFailure } from "@/lib/auth-throttle.server";
import { normalizeIdentifier } from "@/lib/auth-crypto.server";
import { createAuthSession } from "@/lib/auth-session.server";
import { withDatabaseRetry } from "@/lib/database-retry";
import { prisma } from "@/lib/prisma";

const DUMMY_PASSWORD_HASH = "$2b$12$jqxl4F08XHFi.2eUIFB5iuQAHYWCb7jp9nSDZm.SoQZLBMXgL7J9G";
const secureCookies = process.env.NEXTAUTH_URL
  ? process.env.NEXTAUTH_URL.startsWith("https://")
  : process.env.NODE_ENV === "production";
const credentialsSchema = z.object({
  identifier: z.string().trim().min(1).max(160),
  password: z.string().min(1).max(256),
});

export const authOptions: NextAuthOptions = {
  secret: authSecret(),
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  jwt: { maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  useSecureCookies: secureCookies,
  cookies: {
    sessionToken: {
      name: secureCookies ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: secureCookies },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Identifiants Presence Plus",
      credentials: {
        identifier: { label: "E-mail ou matricule", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(rawCredentials, request) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        const identifier = parsed.success ? normalizeIdentifier(parsed.data.identifier) : "invalid";
        const passwordBytes = parsed.success ? new TextEncoder().encode(parsed.data.password).length : 0;
        const validInput = parsed.success && passwordBytes <= 72;
        const password = validInput ? parsed.data.password : "invalid";
        const ip = clientIpFromHeaders(request.headers);

        if (await isAuthThrottled("LOGIN", identifier, ip)) {
          await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
          return null;
        }

        const user = validInput ? await withDatabaseRetry(() => prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: identifier, mode: "insensitive" } },
              { matricule: { equals: identifier, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            role: true,
            adminLevel: true,
            status: true,
            activatedAt: true,
            mustChangePassword: true,
            sessionVersion: true,
          },
        })) : null;
        const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
        if (!user || !passwordMatches || user.status !== "ACTIVE" || !user.activatedAt) {
          await registerAuthFailure("LOGIN", identifier, ip);
          return null;
        }

        const authSessionId = randomUUID();
        let authSession;
        try {
          authSession = await withDatabaseRetry(() => prisma.$transaction(async (tx) => {
            const now = new Date();
            await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: now } });
            const created = await createAuthSession(tx, user.id, request.headers, ip, now, authSessionId);
            await tx.auditLog.create({
              data: { actorId: user.id, action: "LOGIN_SUCCESS", entityType: "AuthSession", entityId: created.id, metadata: { method: identifier.includes("@") ? "EMAIL" : "MATRICULE" } },
            });
            return created;
          }, { maxWait: 15_000, timeout: 30_000 }));
        } catch (error) {
          const duplicate = error && typeof error === "object" && "code" in error && error.code === "P2002";
          if (!duplicate) throw error;
          authSession = await withDatabaseRetry(() => prisma.authSession.findUniqueOrThrow({ where: { id: authSessionId } }));
        }
        await clearLoginThrottle(identifier, ip);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          adminLevel: user.adminLevel ?? undefined,
          sessionVersion: user.sessionVersion,
          mustChangePassword: user.mustChangePassword,
          authSessionId: authSession.id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.adminLevel = user.adminLevel;
        token.sessionVersion = user.sessionVersion;
        token.mustChangePassword = user.mustChangePassword;
        token.authSessionId = user.authSessionId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.userId,
        role: token.role,
        adminLevel: token.adminLevel,
        sessionVersion: token.sessionVersion,
        mustChangePassword: token.mustChangePassword,
        authSessionId: token.authSessionId,
      };
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      if (!token?.userId || !token.authSessionId) return;
      await prisma.$transaction(async (tx) => {
        await tx.authSession.updateMany({
          where: { id: token.authSessionId, userId: token.userId, revokedAt: null },
          data: { revokedAt: new Date(), revokedReason: "LOGOUT" },
        });
        await tx.auditLog.create({
          data: { actorId: token.userId, action: "LOGOUT", entityType: "AuthSession", entityId: token.authSessionId },
        });
      }).catch(() => undefined);
    },
  },
};
