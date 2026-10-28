import { isValidDateOnly } from "../calculation/date-only.ts";

export type BirthFormValues = {
  fullName?: string;
  birthPlace?: string;
  localDate?: string;
  localTime?: string;
  timeZone?: string;
  latitude?: string;
  longitude?: string;
  birthTimeAccuracy?: string;
  timeKnown: boolean;
};

export type BirthFormField = "birthPlace" | "localDate" | "localTime" | "timeZone" | "latitude" | "longitude" | "timeKnown";

export type BirthFormValidation = { valid: true } | { valid: false; field: BirthFormField; messageKey: string };

export function canSubmitBirthForm(valid: boolean, busy: boolean) {
  return valid && !busy;
}

function validDate(value: string) {
  if (!isValidDateOnly(value)) return false;
  const year = Number(value.slice(0, 4));
  return year >= 1800 && year <= 2399;
}

function validTime(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match !== null;
}

function validTimeZone(value: string) {
  if (!value.trim()) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function validCoordinate(value: string | undefined, minimum: number, maximum: number) {
  if (!value?.trim()) return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum;
}

export function validateBirthForm(values: BirthFormValues): BirthFormValidation {
  if (!validDate(values.localDate ?? "")) return { valid: false, field: "localDate", messageKey: "validation.date" };
  if (values.localTime?.trim() && !validTime(values.localTime)) return { valid: false, field: "localTime", messageKey: "validation.time" };
  if (values.timeZone?.trim() && !validTimeZone(values.timeZone)) return { valid: false, field: "timeZone", messageKey: "validation.timeZone" };
  if (values.latitude?.trim() && !validCoordinate(values.latitude, -90, 90)) return { valid: false, field: "latitude", messageKey: "validation.latitude" };
  if (values.longitude?.trim() && !validCoordinate(values.longitude, -180, 180)) return { valid: false, field: "longitude", messageKey: "validation.longitude" };
  return { valid: true };
}

export function hasChartCalculationInputs(values: BirthFormValues): boolean {
  return Boolean(values.localDate && values.localTime?.trim() && values.timeZone?.trim()
    && validTime(values.localTime) && validTimeZone(values.timeZone)
    && validCoordinate(values.latitude, -90, 90) && validCoordinate(values.longitude, -180, 180));
}

export function birthFormValues(form: HTMLFormElement): BirthFormValues {
  const data = new FormData(form);
  const value = (name: string) => String(data.get(name) ?? "");
  const localTime = value("localTime");
  return {
    fullName: value("fullName"),
    birthPlace: value("birthPlace"),
    localDate: value("localDate"),
    localTime,
    timeZone: value("timeZone"),
    latitude: value("latitude"),
    longitude: value("longitude"),
    birthTimeAccuracy: value("birthTimeAccuracy"),
    timeKnown: Boolean(localTime),
  };
}
