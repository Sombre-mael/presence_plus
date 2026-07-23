
"use server";

import { prisma } from "@/lib/prisma";
import { Role } from "../generated/prisma/enums";

export async function getDashboardStats() {
  const [
    students,
    teachers,
    courses,
    sessions,
    attendances,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        role: Role.STUDENT,
      },
    }),

    prisma.user.count({
      where: {
        role: Role.TEACHER,
      },
    }),

    prisma.course.count(),

    prisma.session.count(),

    prisma.attendance.count(),
  ]);

  return {
    students,
    teachers,
    courses,
    sessions,
    attendances,
  };
}

