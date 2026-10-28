import { addCalendarDays, ageOnDate, type TimelinePeriod, type TimelineClassification } from "./life-timeline.ts";

export type TimingRuleLifecycle = "APPROVED" | "REVIEW_REQUIRED" | "UNSUPPORTED";
export type TimingEvidenceDirection = "supportive" | "challenging" | "neutral";

export type TimingRuleEvidence = {
  ruleId: string;
  evidenceKey: string;
  lifecycle: TimingRuleLifecycle;
  direction: TimingEvidenceDirection;
  explanation: string;
};

export type PeriodClassificationResult = {
  classification: TimelineClassification;
  explanation: "favorable" | "challenging" | "mixed" | "neutral" | "incomplete";
  contributingEvidence: TimingRuleEvidence[];
};

export type DashaTimelinePeriod = {
  lord: string;
  start: string;
  end: string;
  antardashas?: DashaTimelinePeriod[];
  pratyantardashas?: DashaTimelinePeriod[];
};

export type DashaTimelineData = {
  mahadashas?: DashaTimelinePeriod[];
};

export type PeriodDashaEvidence = {
  level: "Mahadasha" | "Antardasha" | "Pratyantardasha";
  lord: string;
  start: string;
  end: string;
};

export type PeriodAnalysis = {
  classification: TimelineClassification;
  explanation: "favorable" | "challenging" | "mixed" | "neutral" | "incomplete";
  dashaEvidence: PeriodDashaEvidence[];
  dashaComplete: boolean;
};

export type DashaNatalContext = {
  planets: { name: string; sign: string; house: number; motion?: string }[];
  houses: { house: number; sign: string }[];
  dignity: { name: string; dignity: string; sign: string }[];
};

export type PersonalizedDashaEvidence = PeriodDashaEvidence & {
  periodStatus: "past" | "current" | "upcoming" | "unavailable";
  ageAtStart: number | null;
  ageAtEnd: number | null;
  natalPlacement: { name: string; sign: string; house: number; motion?: string } | null;
  houseLordships: number[];
  dignity: { dignity: string; sign: string } | null;
  sameSignPlanets: string[];
};

const ACTIVE_PERIOD_RULES: readonly string[] = [];
const signLords: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon", Leo: "Sun", Virgo: "Mercury",
  Libra: "Venus", Scorpio: "Mars", Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};

function localDateAt(instant: number, timeZone: string): string | null {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  } catch {
    return null;
  }
}

function planetForDashaLord(planets: DashaNatalContext["planets"], lord: string) {
  if (lord === "Rahu") return planets.find((planet) => /^(True|Mean) node$/i.test(planet.name));
  if (lord === "Ketu") return planets.find((planet) => /^(True|Mean) Ketu$/i.test(planet.name));
  return planets.find((planet) => planet.name === lord);
}

export function personalizeDashaEvidence(
  evidence: PeriodDashaEvidence,
  birthDate: string,
  timeZone: string,
  natal: DashaNatalContext | null | undefined,
  at = new Date(),
): PersonalizedDashaEvidence {
  const start = Date.parse(evidence.start);
  const end = Date.parse(evidence.end);
  const validInterval = Number.isFinite(start) && Number.isFinite(end) && end > start;
  const startDate = validInterval ? localDateAt(start, timeZone) : null;
  const endDate = validInterval ? localDateAt(end - 1, timeZone) : null;
  let ageAtStart: number | null = null;
  let ageAtEnd: number | null = null;
  if (startDate && endDate) {
    try {
      ageAtStart = ageOnDate(birthDate, startDate);
      ageAtEnd = ageOnDate(birthDate, endDate);
    } catch {
      ageAtStart = null;
      ageAtEnd = null;
    }
  }

  const periodStatus = !validInterval || !Number.isFinite(at.getTime())
    ? "unavailable"
    : at.getTime() < start ? "upcoming" : at.getTime() < end ? "current" : "past";
  const natalPlacement = natal ? planetForDashaLord(natal.planets, evidence.lord) ?? null : null;
  const houseLordships = natal
    ? natal.houses.filter((house) => signLords[house.sign] === evidence.lord).map((house) => house.house)
    : [];
  const dignity = natalPlacement
    ? natal?.dignity.find((item) => item.name === natalPlacement.name) ?? null
    : null;
  const sameSignPlanets = natalPlacement && natal
    ? natal.planets.filter((planet) => planet.name !== natalPlacement.name && planet.sign === natalPlacement.sign).map((planet) => planet.name)
    : [];

  return {
    ...evidence,
    periodStatus,
    ageAtStart,
    ageAtEnd,
    natalPlacement,
    houseLordships,
    dignity: dignity ? { dignity: dignity.dignity, sign: dignity.sign } : null,
    sameSignPlanets,
  };
}

export function aggregatePeriodEvidence(
  applicableRuleIds: readonly string[],
  evidence: readonly TimingRuleEvidence[],
  inputsComplete: boolean,
): PeriodClassificationResult {
  if (!inputsComplete || applicableRuleIds.length === 0) {
    return { classification: "not-evaluated", explanation: "incomplete", contributingEvidence: [] };
  }

  const applicable = new Set(applicableRuleIds);
  const relevant = evidence.filter((item) => applicable.has(item.ruleId));
  if (
    relevant.some((item) => item.lifecycle !== "APPROVED")
    || applicableRuleIds.some((ruleId) => !relevant.some((item) => item.ruleId === ruleId))
  ) {
    return { classification: "not-evaluated", explanation: "incomplete", contributingEvidence: [] };
  }

  const uniqueEvidence = new Map<string, TimingRuleEvidence>();
  for (const item of relevant) {
    const key = `${item.evidenceKey}:${item.direction}`;
    if (!uniqueEvidence.has(key)) uniqueEvidence.set(key, item);
  }
  const contributingEvidence = [...uniqueEvidence.values()];
  const directions = new Set(contributingEvidence.map((item) => item.direction));
  const supportive = directions.has("supportive");
  const challenging = directions.has("challenging");
  if (supportive && challenging) {
    return { classification: "mixed", explanation: "mixed", contributingEvidence };
  }
  if (supportive) {
    return { classification: "favorable", explanation: "favorable", contributingEvidence };
  }
  if (challenging) {
    return { classification: "challenging", explanation: "challenging", contributingEvidence };
  }
  return { classification: "neutral", explanation: "neutral", contributingEvidence };
}

function localMidnightInstant(date: string, timeZone: string): number | null {
  const [year, month, day] = date.split("-").map(Number);
  const targetMidnight = Date.UTC(year, month - 1, day);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  for (const hour of [12, 0, 18, 6]) {
    const probe = new Date(Date.UTC(year, month - 1, day, hour));
    const parts = Object.fromEntries(formatter.formatToParts(probe).map((part) => [part.type, part.value]));
    if (Number(parts.year) !== year || Number(parts.month) !== month || Number(parts.day) !== day) continue;
    const localAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const candidate = targetMidnight - (localAsUtc - probe.getTime());
    const check = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map((part) => [part.type, part.value]));
    if (
      Number(check.year) === year && Number(check.month) === month && Number(check.day) === day
      && Number(check.hour) === 0 && Number(check.minute) === 0
    ) return candidate;
  }
  return null;
}

function overlaps(start: number, end: number, period: DashaTimelinePeriod): boolean {
  const periodStart = Date.parse(period.start);
  const periodEnd = Date.parse(period.end);
  return Number.isFinite(periodStart) && Number.isFinite(periodEnd) && periodStart < end && periodEnd > start;
}

function allPeriods(dasha: DashaTimelineData | null | undefined) {
  const result: PeriodDashaEvidence[] = [];
  for (const maha of dasha?.mahadashas ?? []) {
    result.push({ level: "Mahadasha", lord: maha.lord, start: maha.start, end: maha.end });
    for (const antar of maha.antardashas ?? []) {
      result.push({ level: "Antardasha", lord: antar.lord, start: antar.start, end: antar.end });
      for (const pratyantar of antar.pratyantardashas ?? []) {
        result.push({ level: "Pratyantardasha", lord: pratyantar.lord, start: pratyantar.start, end: pratyantar.end });
      }
    }
  }
  return result;
}

function mahadashaCoverageComplete(start: number, end: number, mahadashas: readonly DashaTimelinePeriod[]): boolean {
  const ranges = mahadashas
    .map((period) => ({ start: Date.parse(period.start), end: Date.parse(period.end) }))
    .filter((period) => Number.isFinite(period.start) && Number.isFinite(period.end) && period.end > start && period.start < end)
    .sort((a, b) => a.start - b.start);
  let coveredUntil = start;
  for (const period of ranges) {
    if (period.start > coveredUntil) return false;
    coveredUntil = Math.max(coveredUntil, period.end);
    if (coveredUntil >= end) return true;
  }
  return false;
}

export function analyzeTimelinePeriod(
  period: TimelinePeriod,
  timeZone: string,
  dasha: DashaTimelineData | null | undefined,
): PeriodAnalysis {
  const start = localMidnightInstant(period.start, timeZone);
  const end = localMidnightInstant(period.end, timeZone);
  const mahadashas = dasha?.mahadashas ?? [];
  const validBoundary = start !== null && end !== null && end > start;
  const dashaComplete = validBoundary && mahadashaCoverageComplete(start, end, mahadashas);
  const dashaEvidence = validBoundary
    ? allPeriods(dasha).filter((item) => overlaps(start, end, item))
    : [];

  const classification = aggregatePeriodEvidence(ACTIVE_PERIOD_RULES, [], validBoundary && dashaComplete);
  return {
    classification: classification.classification,
    explanation: classification.explanation,
    dashaEvidence,
    dashaComplete,
  };
}

export function timelinePeriodEndDate(period: TimelinePeriod): string {
  return addCalendarDays(period.end, -1);
}
