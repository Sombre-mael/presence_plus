// Actions serveur liees aux sessions de presence.
"use server";

import { prisma } from "@/lib/prisma";
import { SessionStatus } from "../generated/prisma/enums";

type CreateSessionInput = {
  name: string;
  description?: string;
  courseId: string;
  scheduledStartAt: string | Date;
  scheduledEndAt: string | Date;
  room: string;
  lateThresholdMinutes: number;
};

export async function createSession(data: CreateSessionInput) {
  const start = new Date(data.scheduledStartAt);
  const end = new Date(data.scheduledEndAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new Error("Les horaires de la session sont invalides.");
  }

  const course = await prisma.course.findUnique({
    where: { id: data.courseId },
    select: { active: true, promotionId: true, teacherId: true },
  });

  if (!course?.active) {
    throw new Error("Ce cours est introuvable ou inactif.");
  }

  const session = await prisma.session.create({
    data: {
      name: data.name,
      description: data.description,
      scheduledStartAt: start,
      scheduledEndAt: end,
      room: data.room,
      lateThresholdMinutes: data.lateThresholdMinutes,
      courses: {
        connect: {
          id: data.courseId,
        },
      },
      teacher: {
        connect: {
          id: course.teacherId,
        },
      },
      promotion: {
        connect: {
          id: course.promotionId,
        },
      },
      status: SessionStatus.SCHEDULED,
    },
  });

  return session;
}

