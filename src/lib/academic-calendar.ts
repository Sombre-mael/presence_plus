export const ACADEMIC_TIME_ZONE = "Africa/Lubumbashi";

export function currentAcademicDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ACADEMIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function atNoonUtc(date: string) {
  return new Date(`${date}T12:00:00Z`);
}

export function addAcademicDays(date: string, amount: number) {
  const value = atNoonUtc(date);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function startOfAcademicWeek(date: string) {
  const day = atNoonUtc(date).getUTCDay();
  return addAcademicDays(date, -((day + 6) % 7));
}

export function academicWeek(date = currentAcademicDate()) {
  const start = startOfAcademicWeek(date);
  return Array.from({ length: 7 }, (_, index) => addAcademicDays(start, index));
}

export function academicMonth(date = currentAcademicDate()) {
  return date.slice(0, 7);
}

export function shiftAcademicMonth(month: string, amount: number) {
  const value = new Date(`${month}-01T12:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + amount);
  return value.toISOString().slice(0, 7);
}

export function academicMonthGrid(month: string) {
  const first = new Date(`${month}-01T12:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - offset + 1;
    return day >= 1 && day <= daysInMonth ? `${month}-${String(day).padStart(2, "0")}` : undefined;
  });
}

export function formatAcademicDay(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("fr-FR", options ?? { weekday: "long", day: "numeric", month: "long" }).format(atNoonUtc(date));
}

export function formatAcademicMonth(month: string) {
  const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(atNoonUtc(`${month}-01`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
