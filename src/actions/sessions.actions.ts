// Actions serveur liees aux sessions de presence.
"use server";

import { prisma } from "@/lib/prisma";
import { SessionStatus } from "../generated/prisma/enums";

type CreateSessionInput = {
  name: string;
  description?: string;
  courseId: string;
  teacherId: string;
};

export async function createSession(data: CreateSessionInput) {
  const session = await prisma.session.create({
    data: {
      name: data.name,
      description: data.description,
      courses: {
        connect: {
          id: data.courseId,
        },
      },
      teacher: {
        connect: {
          id: data.teacherId,
        },
      },
      status: SessionStatus.ACTIVE,
    },
  });

  return session;
}

