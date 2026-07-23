import { prisma } from "../src/lib/prisma";
import { Role, UserStatus, SessionStatus, AttendanceStatus, AttendanceSource } from "../src/generated/prisma/enums";

async function main() {
  // Promotion
  const promotion = await prisma.promotion.create({
    data: {
      name: "BAC2 Informatique",
      description: "Promotion de 2026",
    },
  });

  // Admin

  const admin = await prisma.user.create({
    data: {
      name: "Anatole KASA",
      email: "admin@example.com",
      password: "password",
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // Teacher

  const teacher = await prisma.user.create({
    data: {
      name: " Gedeon KASUNGAMI",
      email: "teacher@example.com",
      password: "password",
      role: Role.TEACHER,
      status: UserStatus.ACTIVE,
    },
  });

  // Student

  const student = await prisma.user.create({
    data: {
      name: "Youssouf MWAMINI",
      email: "student@example.com",
      password: "password",
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,

      promotion: {
        connect: {
          id: promotion.id,
        },
      },
    },
  });

  // Course

  const course = await prisma.course.create({
    data: {
      name: "Algorithmes et Structures de Données",
      description: "Cours de démonstration",

      teacher: {
        connect: {
          id: teacher.id,
        },
      },

      promotion: {
        connect: {
          id: promotion.id,
        },
      },
    },
  });

  // Session

  const session = await prisma.session.create({
    data: {
      name: "Séance 1",
      description: "Première séance",

      status: SessionStatus.ACTIVE,

      teacher: {
        connect: {
          id: teacher.id,
        },
      },

      courses: {
        connect: {
          id: course.id,
        },
      },
    },
  });

  // Attendance
  await prisma.attendance.create({
    data: {
      status: AttendanceStatus.PRESENT,
      source: AttendanceSource.QR_CODE,

      user: {
        connect: {
          id: student.id,
        },
      },

      session: {
        connect: {
          id: session.id,
        },
      },
    },
  });

  // Audit Log

  await prisma.auditLog.create({
    data: {
      action: "Création des données de démonstration",

      user: {
        connect: {
          id: admin.id,
        },
      },
    },
  });

  console.log("Seed terminé.");
}

main();

