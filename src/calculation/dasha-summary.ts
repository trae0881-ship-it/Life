import { ageOnDate } from "./life-timeline.ts";

export type DashaPeriod = {
  lord: string;
  start: string;
  end: string;
  antardashas?: DashaPeriod[];
  pratyantardashas?: DashaPeriod[];
};

export type DashaSummary = {
  age: number;
  mahadasha: DashaPeriod;
  antardasha: DashaPeriod | null;
  start: string;
  end: string;
  remainingDays: number;
  method: string;
} | null;

export function completedAge(birthDate: string, at: Date, timeZone = "UTC"): number | null {
  if (!Number.isFinite(at.getTime())) return null;
  try {
    const date = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(at).map((part) => [part.type, part.value]));
    return ageOnDate(birthDate, `${date.year}-${date.month}-${date.day}`);
  } catch {
    return null;
  }
}

export function currentDashaSummary(
  birthDate: string,
  periods: { mahadashas?: DashaPeriod[] } | null | undefined,
  at = new Date(),
  method = "Vimshottari · start-inclusive, end-exclusive",
  timeZone = "UTC",
): DashaSummary {
  const age = completedAge(birthDate, at, timeZone);
  if (age === null || !periods?.mahadashas) return null;
  const instant = at.getTime();
  const mahadasha = periods.mahadashas.find((period) => Date.parse(period.start) <= instant && instant < Date.parse(period.end));
  if (!mahadasha) return null;
  const antardasha = mahadasha.antardashas?.find((period) => Date.parse(period.start) <= instant && instant < Date.parse(period.end)) ?? null;
  return {
    age,
    mahadasha,
    antardasha,
    start: antardasha?.start ?? mahadasha.start,
    end: antardasha?.end ?? mahadasha.end,
    remainingDays: Math.max(0, Math.ceil((Date.parse(antardasha?.end ?? mahadasha.end) - instant) / 86_400_000)),
    method,
  };
}
