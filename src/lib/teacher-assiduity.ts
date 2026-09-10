import type { AttendanceRecord, SessionSummary } from "@/types";
import type { AcademicDataState } from "@/types/admin";
import { addAcademicDays, currentAcademicDate } from "@/lib/academic-calendar";

export type AssiduityPeriod = "ALL" | "30" | "90" | "180";
export type AssiduityLevel = "REGULAR" | "ATTENTION" | "NO_DATA";

export function getTeacherCourses(state: AcademicDataState, teacherId: string) {
  const courses = new Map(state.courses.filter((course) => course.teacherId === teacherId)
    .map((course) => [course.id, { id: course.id, name: course.name, code: course.code, promotionId: course.promotionId }]));
  // A reassigned course must not hide the teacher's own historical sessions.
  for (const session of state.sessions) {
    if (session.teacherId === teacherId && !courses.has(session.courseId)) {
      courses.set(session.courseId, { id: session.courseId, name: session.courseName, code: session.courseCode, promotionId: session.promotionId ?? "" });
    }
  }
  return [...courses.values()].sort((a, b) => a.code.localeCompare(b.code, "fr"));
}

export function getTeacherAssiduity(
  state: AcademicDataState,
  teacherId: string,
  period: AssiduityPeriod = "ALL",
  today = currentAcademicDate(),
) {
  const start = period === "ALL" ? "" : addAcademicDays(today, 1 - Number(period));
  const courses = getTeacherCourses(state, teacherId);
  const records = new Map(state.attendances.map((item) => [`${item.sessionId}:${item.studentId}`, item]));
  const ownSessions = state.sessions.filter((session) => session.teacherId === teacherId);
  const rows = courses.flatMap((course) => {
    const sessions = ownSessions.filter((session) => session.courseId === course.id && session.status === "COMPLETED" && session.date <= today && session.date >= start);
    const currentlyAssigned = state.courses.some((item) => item.id === course.id && item.teacherId === teacherId);
    return state.users.filter((student) => student.role === "STUDENT").flatMap((student) => {
      const currentEnrollment = currentlyAssigned && student.promotionId === course.promotionId && student.status === "ACTIVE";
      const history: { session: SessionSummary; attendance?: AttendanceRecord }[] = sessions
        .filter((session) => session.enrolledStudentIds?.includes(student.id) || records.has(`${session.id}:${student.id}`))
        .map((session) => ({ session, attendance: records.get(`${session.id}:${student.id}`) }))
        .sort((a, b) => `${b.session.date}T${b.session.startTime}`.localeCompare(`${a.session.date}T${a.session.startTime}`));
      if (!currentEnrollment && !history.length) return [];
      const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0, MISSING: 0 };
      for (const item of history) counts[item.attendance?.status ?? "MISSING"]++;
      const attended = counts.PRESENT + counts.LATE;
      const eligible = attended + counts.ABSENT;
      const attendanceRate = eligible ? Math.round(100 * attended / eligible) : null;
      const punctualityRate = attended ? Math.round(100 * counts.PRESENT / attended) : null;
      const level: AssiduityLevel = !eligible ? "NO_DATA" : attended / eligible < 0.8 ? "ATTENTION" : "REGULAR";
      return [{ key: `${course.id}:${student.id}`, student, course, currentEnrollment, history, counts, attended, eligible, attendanceRate, punctualityRate, level }];
    });
  });
  return rows.sort((a, b) => a.student.name.localeCompare(b.student.name, "fr") || a.course.code.localeCompare(b.course.code, "fr"));
}

export type TeacherAssiduityRow = ReturnType<typeof getTeacherAssiduity>[number];
