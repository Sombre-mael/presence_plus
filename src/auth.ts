import "server-only";

import bcrypt from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { z } from "zod";
import { authSecret } from "@/lib/env.server";
import { clientIpFromHeaders } from "@/lib/auth-request.server";
import { clearLoginThrottle, isAuthThrottled, registerAuthFailure } from "@/lib/auth-throttle.server";
import { normalizeIdentifier } from "@/lib/auth-crypto.server";
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

        const user = validInput ? await prisma.user.findFirst({
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
            status: true,
            activatedAt: true,
            mustChangePassword: true,
            sessionVersion: true,
          },
        }) : null;
        const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
        if (!user || !passwordMatches || user.status !== "ACTIVE" || !user.activatedAt) {
          await registerAuthFailure("LOGIN", identifier, ip);
          return null;
        }

        await prisma.$transaction([
          prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
          prisma.auditLog.create({
            data: { actorId: user.id, action: "LOGIN_SUCCESS", entityType: "User", entityId: user.id, metadata: { method: identifier.includes("@") ? "EMAIL" : "MATRICULE" } },
          }),
        ]);
        await clearLoginThrottle(identifier, ip);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          sessionVersion: user.sessionVersion,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
        token.mustChangePassword = user.mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.userId,
        role: token.role,
        sessionVersion: token.sessionVersion,
        mustChangePassword: token.mustChangePassword,
      };
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      if (!token?.userId) return;
      await prisma.auditLog.create({
        data: { actorId: token.userId, action: "LOGOUT", entityType: "User", entityId: token.userId },
      }).catch(() => undefined);
    },
  },
};
