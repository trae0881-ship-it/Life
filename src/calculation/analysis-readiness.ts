import { isValidDateOnly } from "./date-only.ts";

export type AnalysisReadiness =
  | "MISSING_DOB"
  | "DOB_AVAILABLE"
  | "BIRTH_DETAILS_INCOMPLETE"
  | "CHART_READY"
  | "CHART_CALCULATED"
  | "ANALYSIS_READY"
  | "ANALYSIS_LIMITED";

export type ReadinessInput = {
  localDate?: string;
  localTime?: string;
  timeZone?: string;
  latitude?: string | number;
  longitude?: string | number;
  birthPlace?: string;
  timeKnown?: boolean;
};

function isCalendarDate(value: string | undefined): boolean {
  if (!value || !isValidDateOnly(value)) return false;
  const year = Number(value.slice(0, 4));
  return year >= 1800 && year <= 2399;
}

function isValidTime(value: string | undefined): boolean {
  return Boolean(value && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value));
}

function isValidTimeZone(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function isValidCoordinate(value: string | number | undefined, minimum: number, maximum: number): boolean {
  if (value === undefined || value === "") return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum;
}

export function analysisReadiness(
  input: ReadinessInput,
  options: { chartCalculated?: boolean; supportedAnalysisAvailable?: boolean } = {},
): AnalysisReadiness {
  if (!isCalendarDate(input.localDate)) return "MISSING_DOB";

  const hasAdditionalDetails = Boolean(
    input.birthPlace?.trim()
    || input.localTime
    || input.timeZone
    || input.latitude !== undefined && input.latitude !== ""
    || input.longitude !== undefined && input.longitude !== "",
  );
  if (!hasAdditionalDetails) return "DOB_AVAILABLE";

  const birthDetailsComplete = Boolean(
    input.timeKnown !== false
    && isValidTime(input.localTime)
    && isValidTimeZone(input.timeZone)
    && isValidCoordinate(input.latitude, -90, 90)
    && isValidCoordinate(input.longitude, -180, 180),
  );
  if (!birthDetailsComplete) return "BIRTH_DETAILS_INCOMPLETE";
  if (!options.chartCalculated) return "CHART_READY";
  return options.supportedAnalysisAvailable ? "ANALYSIS_READY" : "CHART_CALCULATED";
}
