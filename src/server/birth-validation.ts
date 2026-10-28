import { InputError, resolveBirthInput, type BirthInput } from "../calculation/time.ts";
import { isValidDateOnly } from "../calculation/date-only.ts";

export type BirthRecordInput = {
  birthPlace: string | null;
  localDate: string;
  localTime: string | null;
  timeZone: string | null;
  latitude: number | null;
  longitude: number | null;
  birthTimeAccuracy: BirthInput["birthTimeAccuracy"] | null;
};
type BirthTimeAccuracy = Exclude<BirthInput["birthTimeAccuracy"], undefined>;

function isBirthTimeAccuracy(value: unknown): value is BirthTimeAccuracy {
  return value === "exact" || value === "within-5-minutes" || value === "within-15-minutes"
    || value === "within-1-hour" || value === "approximate";
}

export function validateBirthRecord(value: Record<string, unknown>): BirthRecordInput {
  if (typeof value.localDate !== "string" || !isValidDateOnly(value.localDate)
      || Number(value.localDate.slice(0, 4)) < 1800 || Number(value.localDate.slice(0, 4)) > 2399) {
    throw new InputError("Enter a valid birth date; supported years are 1800 through 2399.", "INVALID_BIRTH_PROFILE");
  }
  const optionalString = (field: string) => {
    const supplied = value[field];
    if (supplied === undefined || supplied === null || supplied === "") return null;
    if (typeof supplied !== "string") throw new InputError(`Invalid ${field}.`, "INVALID_BIRTH_PROFILE");
    const normalized = supplied.trim();
    return normalized || null;
  };
  const optionalNumber = (field: string, minimum: number, maximum: number) => {
    const supplied = value[field];
    if (supplied === undefined || supplied === null || supplied === "") return null;
    if (typeof supplied !== "number" || !Number.isFinite(supplied) || supplied < minimum || supplied > maximum) {
      throw new InputError(`Invalid ${field}.`, "INVALID_BIRTH_PROFILE");
    }
    return supplied;
  };
  const localTime = optionalString("localTime");
  const birthPlace = optionalString("birthPlace");
  const timeZone = optionalString("timeZone");
  const latitude = optionalNumber("latitude", -90, 90);
  const longitude = optionalNumber("longitude", -180, 180);
  if (localTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(localTime)) {
    throw new InputError("Enter a valid local time in 24-hour format.", "INVALID_BIRTH_PROFILE");
  }
  if (birthPlace && birthPlace.length > 160) {
    throw new InputError("Enter a birthplace label up to 160 characters.", "INVALID_BIRTH_PROFILE");
  }
  if (timeZone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone }).format(0);
    } catch {
      throw new InputError("Enter a valid IANA timezone identifier.", "INVALID_BIRTH_PROFILE");
    }
  }
  const rawAccuracy = value.birthTimeAccuracy;
  if (rawAccuracy !== undefined && rawAccuracy !== null && rawAccuracy !== "" && !isBirthTimeAccuracy(rawAccuracy)) {
    throw new InputError("Choose a supported birth-time accuracy value.", "INVALID_BIRTH_PROFILE");
  }
  const accuracy = isBirthTimeAccuracy(rawAccuracy) ? rawAccuracy : null;
  const input: BirthRecordInput = {
    birthPlace,
    localDate: value.localDate,
    localTime,
    timeZone,
    latitude,
    longitude,
    birthTimeAccuracy: accuracy,
  };
  return input;
}

export function validateChartInput(value: Record<string, unknown>): BirthInput {
  if (typeof value.localDate !== "string" || typeof value.localTime !== "string" ||
      typeof value.timeZone !== "string" || typeof value.latitude !== "number" ||
      typeof value.longitude !== "number") {
    throw new InputError("A chart needs a birth date, recorded local time, timezone, and coordinates. No time or location was assumed.", "MISSING_CHART_DETAILS");
  }
  const input: BirthInput = {
    localDate: value.localDate,
    localTime: value.localTime,
    timeZone: value.timeZone,
    latitude: value.latitude,
    longitude: value.longitude,
  };
  const stringOptions: Record<string, readonly string[]> = {
    ayanamsa: ["Lahiri", "Raman", "Krishnamurti"],
    houseSystem: ["WholeSign", "Placidus", "Koch", "Equal"],
    nodeMode: ["mean", "true", "both"],
    coordinateSource: ["birth-record", "gazetteer", "manual-unknown"],
    birthTimeAccuracy: ["exact", "within-5-minutes", "within-15-minutes", "within-1-hour", "approximate"],
  } as const;
  for (const [field, allowed] of Object.entries(stringOptions)) {
    const supplied = value[field];
    if (supplied === null || supplied === "") continue;
    if (supplied !== undefined && (typeof supplied !== "string" || !allowed.includes(supplied))) {
      throw new InputError(`Unsupported ${field} value.`, `INVALID_${field.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`);
    }
    if (typeof supplied === "string") Object.assign(input, { [field]: supplied });
  }
  for (const field of ["fullName", "birthPlace", "selectedOffset"] as const) {
    const supplied = value[field];
    if (supplied === null || supplied === "") continue;
    if (supplied !== undefined && typeof supplied !== "string") {
      throw new InputError(`Invalid ${field} value.`, `INVALID_${field.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`);
    }
    if (typeof supplied === "string") Object.assign(input, { [field]: supplied });
  }
  resolveBirthInput(input);
  return input;
}
