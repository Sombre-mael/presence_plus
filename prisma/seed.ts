import { prisma } from "../src/lib/prisma";
import { Role, UserStatus, SessionStatus, AttendanceStatus, AttendanceSource } from "../src/generated/prisma/enums";
import bcrypt from "bcryptjs";

async function main() {
  const passwordHash = await bcrypt.hash("password", 10);
  // Promotion
  const promotion = await prisma.promotion.upsert({
    where:
      { 
        name: "BAC2 Informatique" 
      },
    update: {},
    create: {
      name: "BAC2 Informatique",
      department: "Informatique",
      academicYear: "2026-01-01",
      description: "Promotion de 2026",
    },
  });

  // Admin

  const admin = await prisma.user.upsert({
    where: 
    { 
      email: "admin@example.com"
    },
    update: {},
    create: {
      matricule: "ADM001",
      name: "Anatole KASA",
      email: "admin@example.com",
      passwordHash: passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // Teacher

  const teacher = await prisma.user.upsert({
    where: 
    { 
      email: "teacher@example.com" 
    },
    update: {},
    create: {
      matricule: "TEA001",
      name: " Gedeon KASUNGAMI",
      email: "teacher@example.com",
      passwordHash: passwordHash,
      role: Role.TEACHER,
      status: UserStatus.ACTIVE,
    },
  });

  // Student

  const student = await prisma.user.upsert({
    where: 
    { 
      email: "student@example.com" 
    },
    update: {},
    create: {
      matricule: "STU001",
      name: "Youssouf MWAMINI",
      email: "student@example.com",
      passwordHash: passwordHash,
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

  const course = await prisma.course.upsert({
    where: {
      code: "INFO101",
    },
    update: {},
    create: {
      code: "INFO101",
      name: "Algorithmes et Structures de Données",
      weeklyHours: 3,
      description: "Cours de démonstration",
      active: true, 

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

  const session = await prisma.session.upsert({
    where: 
    {
      id: "Session_demo",
    },
    update: {},
    create: {
      id: "Session_demo",
      name: "Séance 1",
      description: "Première séance",

      status: SessionStatus.SCHEDULED,
      scheduledStartAt : new Date(),
      scheduledEndAt : new Date(Date.now() + 60 * 60 * 1000), // 1 heure plus tard
      room : "Salle BALABALA",
      lateThresholdMinutes: 15,

      promotion: {
        connect: {
          id: promotion.id,
        },
      },
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

  // Attendance: use findFirst + create or update because there's no compound unique input
  const existingAttendance = await prisma.attendance.findFirst({
    where: { 
      studentId: student.id, 
      sessionId: session.id 
    },
  });

  if (existingAttendance) {
    await prisma.attendance.update({
      where: { 
        id: existingAttendance.id 
      },
      data: {
        status: AttendanceStatus.PRESENT,
        source: AttendanceSource.QR,
        checkedInAt: new Date(),
      },
    });
  } else {
    await prisma.attendance.create({
      data: {
        status: AttendanceStatus.PRESENT,
        source: AttendanceSource.QR,
        checkedInAt: new Date(),

        student: { 
          connect: { 
            id: student.id 
          } 
        },
        session: { 
          connect: { 
            id: session.id 
          } 
        },
      },
    });
  }

  // Audit Log

  await prisma.auditLog.create({
     data: {
      action: "SEED_DATABASE",
      entityType: "DATABASE",
      entityId: session.id,
      
      actor: {
        connect: {
          id: admin.id,
        },
      },
    },
  });

  console.log("Seed terminé.");
}

main()
  .catch((error) => 
  {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

