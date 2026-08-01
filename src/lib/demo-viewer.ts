import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Role, UserSummary } from "@/types";

export const DEMO_VIEWER_COOKIE = "presence-plus-demo-viewer";
export const DEMO_VIEWER_IDS = ["u1", "u2", "u4"] as const;

export type DemoViewerId = (typeof DEMO_VIEWER_IDS)[number];
export type DemoViewer = UserSummary & { promotionId?: string };

const roleHomes: Record<Role, string> = {
  ADMIN: "/admin/dashboard",
  TEACHER: "/teacher/dashboard",
  STUDENT: "/student/dashboard",
};

function signature(id: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET est requis pour le mode demonstration.");
  return createHmac("sha256", secret).update(id).digest("base64url");
}

function isAllowedId(value: string): value is DemoViewerId {
  return DEMO_VIEWER_IDS.includes(value as DemoViewerId);
}

function verifyCookie(value?: string) {
  if (!value) return null;
  const [id, received] = value.split(".");
  if (!isAllowedId(id) || !received) return null;
  const expected = signature(id);
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right) ? id : null;
}

export function demoViewerCookieValue(id: DemoViewerId) {
  return `${id}.${signature(id)}`;
}

export function roleHome(role: Role) {
  return roleHomes[role];
}

export async function getDemoViewer(): Promise<DemoViewer | null> {
  const store = await cookies();
  let id: DemoViewerId | null = null;
  try {
    id = verifyCookie(store.get(DEMO_VIEWER_COOKIE)?.value);
  } catch {
    return null;
  }
  if (!id) return null;

  let user;
  try {
    user = await prisma.user.findFirst({
      where: { id, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        promotionId: true,
        promotion: { select: { name: true } },
      },
    });
  } catch {
    return null;
  }
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    promotion: user.promotion?.name,
    promotionId: user.promotionId ?? undefined,
  };
}
