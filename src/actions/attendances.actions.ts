// Actions serveur liees aux presences.
"use server";

import { prisma } from "@/lib/prisma";
import {
  AttendanceSource,
  AttendanceStatus,
} from "../generated/prisma/enums";

type AttendanceInput = {
  studentId: string;
  sessionId: string;
  source: AttendanceSource;
  checkedInAt?: string | Date;
};

export async function markAttendance(data: AttendanceInput) {
  const existing = await prisma.attendance.findUnique({
    where: {
      studentId_sessionId: {
        studentId: data.studentId,
        sessionId: data.sessionId,
      },
    },
  });

  if (existing) return existing;

  const [session, student] = await Promise.all([
    prisma.session.findUnique({
      where: { id: data.sessionId },
      select: {
        status: true,
        promotionId: true,
        scheduledStartAt: true,
        lateThresholdMinutes: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: data.studentId },
      select: { promotionId: true, role: true, status: true },
    }),
  ]);

  if (!session || session.status !== "ACTIVE") {
    throw new Error("Cette session n'est pas active.");
  }

  if (!student || student.role !== "STUDENT" || student.status !== "ACTIVE") {
    throw new Error("Ce compte étudiant ne peut pas pointer.");
  }

  if (student.promotionId !== session.promotionId) {
    throw new Error("Cette session ne concerne pas la promotion de l'étudiant.");
  }

  const checkedInAt = data.checkedInAt ? new Date(data.checkedInAt) : new Date();
  if (Number.isNaN(checkedInAt.getTime())) {
    throw new Error("L'heure de pointage est invalide.");
  }

  const lateAfter = new Date(
    session.scheduledStartAt.getTime() + session.lateThresholdMinutes * 60_000,
  );

  const attendance = await prisma.attendance.create({
    data: {
      student: { connect: { id: data.studentId } },
      session: { connect: { id: data.sessionId } },
      checkedInAt,
      source: data.source,
      status: checkedInAt > lateAfter ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
    },
  });

  return attendance;
}

