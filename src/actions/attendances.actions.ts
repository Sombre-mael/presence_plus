// Actions serveur liees aux presences.
"use server";

import { prisma } from "@/lib/prisma";
import {
  AttendanceSource,
  AttendanceStatus,
} from "../generated/prisma/enums";

type AttendanceInput = {
  userId: string;
  sessionId: string;
  source: AttendanceSource;
};

export async function markAttendance(data: AttendanceInput) {
    const existing = await prisma.attendance.findUnique({
  where: {
    userId_sessionId: {
      userId: data.userId,
      sessionId: data.sessionId,
    },
  },
});

if (existing) {
  throw new Error("Étudiant déjà pointé.");
}
const attendance = await prisma.attendance.create({
  data: {
    user: {
      connect: {
        id: data.userId,
      },
    },
    session: {
      connect: {
        id: data.sessionId,
      },
    },
    source: data.source,
    status: AttendanceStatus.PRESENT,
  },
});

return attendance;

}

