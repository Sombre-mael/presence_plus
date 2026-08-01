"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  DEMO_VIEWER_COOKIE,
  DEMO_VIEWER_IDS,
  demoViewerCookieValue,
  roleHome,
  type DemoViewerId,
} from "@/lib/demo-viewer";

export async function selectDemoViewerAction(id: DemoViewerId) {
  if (!DEMO_VIEWER_IDS.includes(id)) redirect("/login?error=profile");
  let user: { role: "ADMIN" | "TEACHER" | "STUDENT" } | null;

  try {
    user = await prisma.user.findFirst({
      where: { id, status: "ACTIVE" },
      select: { role: true },
    });
  } catch {
    redirect("/login?error=database");
  }

  if (!user) redirect("/login?error=inactive");

  const store = await cookies();
  store.set(DEMO_VIEWER_COOKIE, demoViewerCookieValue(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  redirect(roleHome(user.role));
}

export async function clearDemoViewerAction() {
  const store = await cookies();
  store.delete(DEMO_VIEWER_COOKIE);
}
