export type BirthInput = {
  fullName?: string;
  birthPlace?: string;
  localDate: string;
  localTime: string;
  timeZone: string;
  latitude: number;
  longitude: number;
  coordinateSource?: "birth-record" | "gazetteer" | "manual-unknown";
  selectedOffset?: string;
  birthTimeAccuracy?: "exact" | "within-5-minutes" | "within-15-minutes" | "within-1-hour" | "approximate";
  ayanamsa?: "Lahiri" | "Raman" | "Krishnamurti";
  houseSystem?: "WholeSign" | "Placidus" | "Koch" | "Equal";
  nodeMode?: "mean" | "true" | "both";
};

export class InputError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = "InputError";
    this.code = code;
    this.details = details;
  }
}

type WallTime = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function formatWallTime(date: Date, timeZone: string): WallTime {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year), month: Number(values.month), day: Number(values.day),
    hour: Number(values.hour), minute: Number(values.minute), second: Number(values.second),
  };
}

function sameWallTime(a: WallTime, b: WallTime): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day &&
    a.hour === b.hour && a.minute === b.minute && a.second === b.second;
}

function toIsoOffset(offsetMs: number): string {
  const sign = offsetMs < 0 ? "-" : "+";
  let totalSeconds = Math.round(Math.abs(offsetMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds -= hours * 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}${seconds ? `:${String(seconds).padStart(2, "0")}` : ""}`;
}

export function resolveBirthInput(input: BirthInput) {
  if (input.fullName !== undefined && (typeof input.fullName !== "string" || input.fullName.trim().length > 120)) throw new InputError("Enter a chart name of up to 120 characters.", "INVALID_NAME");
  if (input.birthPlace !== undefined && (typeof input.birthPlace !== "string" || !input.birthPlace.trim() || input.birthPlace.trim().length > 160)) throw new InputError("Enter a birthplace label (up to 160 characters) and its coordinates.", "INVALID_BIRTHPLACE");
  if (input.birthTimeAccuracy !== undefined && !["exact", "within-5-minutes", "within-15-minutes", "within-1-hour", "approximate"].includes(input.birthTimeAccuracy)) {
    throw new InputError("Choose a supported birth-time accuracy value.", "INVALID_TIME_ACCURACY");
  }
  if (input.ayanamsa !== undefined && !["Lahiri", "Raman", "Krishnamurti"].includes(input.ayanamsa)) {
    throw new InputError("Choose a supported ayanamsa.", "UNSUPPORTED_AYANAMSA");
  }
  if (input.houseSystem !== undefined && !["WholeSign", "Placidus", "Koch", "Equal"].includes(input.houseSystem)) {
    throw new InputError("Choose a supported house system.", "UNSUPPORTED_HOUSE_SYSTEM");
  }
  if (input.nodeMode !== undefined && !["mean", "true", "both"].includes(input.nodeMode)) {
    throw new InputError("Choose mean node, true node, or both.", "INVALID_NODE_MODE");
  }
  if (input.coordinateSource !== undefined && !["birth-record", "gazetteer", "manual-unknown"].includes(input.coordinateSource)) {
    throw new InputError("Choose a supported coordinate source.", "INVALID_COORDINATE_SOURCE");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.localDate) || !/^\d{2}:\d{2}$/.test(input.localTime)) {
    throw new InputError("Enter a valid birth date and time.", "INVALID_DATE_TIME");
  }
  const [year, month, day] = input.localDate.split("-").map(Number);
  const [hour, minute] = input.localTime.split(":").map(Number);
  if (year < 1800 || year > 2399 || month < 1 || month > 12 || hour > 23 || minute > 59) {
    throw new InputError("This first release supports dates from 1800 through 2399 and valid 24-hour times.", "UNSUPPORTED_DATE");
  }
  const calendarCheck = new Date(0);
  calendarCheck.setUTCFullYear(year, month - 1, day);
  calendarCheck.setUTCHours(0, 0, 0, 0);
  if (calendarCheck.getUTCFullYear() !== year || calendarCheck.getUTCMonth() !== month - 1 || calendarCheck.getUTCDate() !== day) {
    throw new InputError("That calendar date does not exist.", "INVALID_DATE");
  }
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90 ||
      !Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    throw new InputError("Latitude must be between −90 and 90; longitude between −180 and 180.", "INVALID_COORDINATES");
  }

  const target: WallTime = { year, month, day, hour, minute, second: 0 };
  const wallAsUtc = new Date(0);
  wallAsUtc.setUTCFullYear(year, month - 1, day);
  wallAsUtc.setUTCHours(hour, minute, 0, 0);
  const naiveMs = wallAsUtc.getTime();
  const offsets = new Set<number>();
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: input.timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    });
  } catch {
    throw new InputError("Enter a valid IANA timezone identifier.", "INVALID_TIMEZONE");
  }
  for (let delta = -36 * 60; delta <= 36 * 60; delta += 30) {
    const candidate = new Date(naiveMs + delta * 60_000);
    const parts = Object.fromEntries(formatter.formatToParts(candidate).map((part) => [part.type, part.value]));
    const localAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    offsets.add(localAsUtc - candidate.getTime());
  }
  const possibilities = [...offsets]
    .map((offsetMs) => ({ instant: new Date(naiveMs - offsetMs), offsetMs }))
    .filter(({ instant }) => sameWallTime(formatWallTime(instant, input.timeZone), target))
    .sort((a, b) => a.instant.getTime() - b.instant.getTime());
  if (!possibilities.length) {
    throw new InputError("This local time does not exist in that timezone because of a clock transition.", "NONEXISTENT_LOCAL_TIME");
  }
  const choices = possibilities.map(({ offsetMs }) => toIsoOffset(offsetMs));
  if (possibilities.length > 1 && !input.selectedOffset) {
    throw new InputError("This local time occurs twice. Choose which UTC offset matches the birth record.", "AMBIGUOUS_LOCAL_TIME", choices);
  }
  const selected = input.selectedOffset
    ? possibilities.find(({ offsetMs }) => toIsoOffset(offsetMs) === input.selectedOffset)
    : possibilities[0];
  if (!selected) throw new InputError("The selected offset is not valid for this local time.", "INVALID_OFFSET", choices);
  return {
    instant: selected.instant,
    resolvedOffset: toIsoOffset(selected.offsetMs),
    offsetChoices: choices,
    timezoneDatabaseVersion: process.versions.tz ?? "runtime ICU timezone database (version unavailable)",
  };
}
