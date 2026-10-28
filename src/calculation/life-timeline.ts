import { isValidDateOnly, utcCalendarDate } from "./date-only.ts";

export type TimelineView = "yearly" | "monthly" | "daily";
export type TimelineClassification = "favorable" | "challenging" | "mixed" | "neutral" | "not-evaluated";

export type TimelinePeriod = {
  start: string;
  end: string;
  age: number;
  ageAtEnd: number;
  label: string;
  category: TimelineClassification;
  reason: string;
};

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Timeline requires a valid YYYY-MM-DD birth date.");
  if (!isValidDateOnly(value)) throw new Error("Timeline requires a real calendar date.");
  const [year, month, day] = value.split("-").map(Number);
  return utcCalendarDate(year, month - 1, day);
}

export function addCalendarYears(date: Date, years: number): Date {
  const result = new Date(date.getTime());
  result.setUTCFullYear(result.getUTCFullYear() + years);
  if (date.getUTCMonth() === 1 && date.getUTCDate() === 29 && result.getUTCMonth() !== 1) {
    result.setUTCDate(0);
  }
  return result;
}

export function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function timelineAgeMarkers(birthDate: string): { age: number; date: string }[] {
  const birth = parseDate(birthDate);
  return Array.from({ length: 80 }, (_, age) => ({
    age,
    date: formatUtcDate(addCalendarYears(birth, age)),
  }));
}

export function addCalendarDays(dateValue: string, days: number): string {
  const result = parseDate(dateValue);
  result.setUTCDate(result.getUTCDate() + days);
  return formatUtcDate(result);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return utcCalendarDate(year, monthIndex + 1, 0).getUTCDate();
}

export function weekdayIndex(dateValue: string): number {
  return parseDate(dateValue).getUTCDay();
}

export function timelineDate(year: number, monthIndex: number, day: number): string {
  return formatUtcDate(utcCalendarDate(year, monthIndex, day));
}

export function timelineRange(birthDate: string) {
  const start = parseDate(birthDate);
  const end = addCalendarYears(start, 80);
  return { start: formatUtcDate(start), end: formatUtcDate(end) };
}

export function ageOnDate(birthDate: string, targetDate: string): number {
  const birth = parseDate(birthDate);
  const target = parseDate(targetDate);
  if (target < birth) throw new RangeError("Selected date is before the birth date.");
  let age = target.getUTCFullYear() - birth.getUTCFullYear();
  if (target < addCalendarYears(birth, age)) age -= 1;
  return age;
}

function clippedPeriod(
  birthDate: string,
  range: { start: string; end: string },
  start: Date,
  end: Date,
  label: string,
): TimelinePeriod | null {
  const startText = formatUtcDate(start);
  const endText = formatUtcDate(end);
  const startClipped = startText < range.start ? range.start : startText;
  const endClipped = endText > range.end ? range.end : endText;
  if (startClipped >= endClipped) return null;
  const lastIncludedDate = addCalendarDays(endClipped, -1);
  return {
    start: startClipped,
    end: endClipped,
    age: ageOnDate(birthDate, startClipped),
    ageAtEnd: ageOnDate(birthDate, lastIncludedDate),
    label,
    category: "not-evaluated",
    reason: "No reviewed timing rule maps the available chart facts to a period classification.",
  };
}

export function buildTimeline(birthDate: string, view: TimelineView, selectedDate = birthDate): TimelinePeriod[] {
  const range = timelineRange(birthDate);
  const selected = parseDate(selectedDate);
  if (selectedDate < range.start || selectedDate > range.end) return [];
  const selectedYear = selected.getUTCFullYear();
  const selectedMonth = selected.getUTCMonth();
  const periods: TimelinePeriod[] = [];

  if (view === "yearly") {
    const birth = parseDate(birthDate);
    for (let age = 0; age < 80; age += 1) {
      const period = clippedPeriod(
        birthDate,
        range,
        addCalendarYears(birth, age),
        addCalendarYears(birth, age + 1),
        String(age),
      );
      if (period) periods.push(period);
    }
    return periods;
  }

  const endExclusive = addCalendarDays(range.end, 1);
  if (view === "monthly") {
    for (let month = 0; month < 12; month += 1) {
      const period = clippedPeriod(
        birthDate,
        { start: range.start, end: endExclusive },
        utcCalendarDate(selectedYear, month, 1),
        utcCalendarDate(selectedYear, month + 1, 1),
        timelineDate(selectedYear, month, 1).slice(0, 7),
      );
      if (period) periods.push(period);
    }
    return periods;
  }

  for (let day = 1; day <= daysInMonth(selectedYear, selectedMonth); day += 1) {
    const start = utcCalendarDate(selectedYear, selectedMonth, day);
    const period = clippedPeriod(
      birthDate,
      { start: range.start, end: endExclusive },
      start,
      new Date(start.getTime() + 86_400_000),
      formatUtcDate(start),
    );
    if (period) periods.push(period);
  }
  return periods;
}
