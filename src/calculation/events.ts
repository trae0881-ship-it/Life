import {
  calculatePosition,
  calculateRiseTransitSet,
  julianDay,
  julianDayToDate,
  setEphemerisPath,
  setSiderealMode,
} from "@swisseph/node";
import { CalculationFlag, LunarPoint, Planet, RiseTransitFlag, SiderealMode } from "@swisseph/core";
import path from "node:path";
import { InputError, resolveBirthInput, type BirthInput } from "./time.ts";

/**
 * Astronomical event calculations for LIFE.
 *
 * All values come from the local Swiss Ephemeris binding (`swe_rise_trans`,
 * `swe_calc_ut`) using the checked-in ephemeris files. No network service and no
 * fallback engine are used. When the engine reports that an event does not occur
 * (for example a circumpolar Sun), the result is reported as `no-event` and no
 * time is invented.
 */

export const AYANAMSA_MODES = { Lahiri: SiderealMode.Lahiri, Raman: SiderealMode.Raman, Krishnamurti: SiderealMode.Krishnamurti } as const;
export type AyanamsaName = keyof typeof AYANAMSA_MODES;

const ephemerisDirectory = () => path.join(process.cwd(), "data", "ephemeris");
const wrap = (degrees: number) => ((degrees % 360) + 360) % 360;
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const RISE_SET_LIMITATION = "Rise/set uses Swiss swe_rise_trans for the upper limb with the binding's default atmospheric refraction at sea level (observer altitude is not collected). Times are derived from the UTC instant treated as UT1; no DUT1 correction is applied.";

function toUtcDate(jd: number): Date {
  const parts = julianDayToDate(jd);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day) + Math.round(parts.hour * 3_600_000));
}

/** Format a UTC instant as wall-clock text in the given IANA zone. */
export function formatInZone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

/** Local calendar date (YYYY-MM-DD) of a UTC instant in a zone. */
export function localDateInZone(instant: Date, timeZone: string): string {
  return formatInZone(instant, timeZone).slice(0, 10);
}

/** Local civil weekday of a UTC instant in a zone. */
export function localWeekdayInZone(instant: Date, timeZone: string): string {
  const name = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long" }).format(instant);
  return name;
}

function zonedDayStart(dateString: string, timeZone: string, latitude: number, longitude: number): Date {
  const base: BirthInput = { localDate: dateString, localTime: "00:00", timeZone, latitude, longitude };
  try {
    return resolveBirthInput(base).instant;
  } catch (error) {
    if (error instanceof InputError && error.code === "AMBIGUOUS_LOCAL_TIME" && Array.isArray(error.details) && error.details.length) {
      return resolveBirthInput({ ...base, selectedOffset: String(error.details[0]) }).instant;
    }
    throw error;
  }
}

function shiftDate(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day));
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

export type RiseSetStatus = "calculated" | "no-event";
export type RiseSetEvent = {
  event: "sunrise" | "sunset" | "moonrise" | "moonset";
  status: RiseSetStatus;
  utc: string | null;
  localTime: string | null;
  julianDayUt: number | null;
  eventLocalDate: string | null;
  occursOnReferenceDate: boolean | null;
  reason: string | null;
};

function riseSetEvent(jdStart: number, body: number, eventType: number, latitude: number, longitude: number): { jd: number } | null {
  try {
    const result = calculateRiseTransitSet(jdStart, body, eventType, longitude, latitude, 0, CalculationFlag.SwissEphemeris);
    if (!Number.isFinite(result.time) || result.time <= 0) return null;
    return { jd: result.time };
  } catch (error) {
    if (error instanceof Error && /^rise or set not found for planet \d+$/.test(error.message)) return null;
    throw error;
  }
}

export type RiseSetOptions = { localDate: string; timeZone: string; latitude: number; longitude: number };

function sunriseOnLocalDate(options: RiseSetOptions): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.localDate)) {
    throw new InputError("Ishtakaal requires a valid YYYY-MM-DD local date.", "INVALID_ISHTAKAAL_DATE");
  }
  setEphemerisPath(ephemerisDirectory());
  const dayStart = zonedDayStart(options.localDate, options.timeZone, options.latitude, options.longitude);
  const jdStart = julianDay(
    dayStart.getUTCFullYear(),
    dayStart.getUTCMonth() + 1,
    dayStart.getUTCDate(),
    dayStart.getUTCHours() + dayStart.getUTCMinutes() / 60,
  );
  const found = riseSetEvent(jdStart, Planet.Sun, RiseTransitFlag.Rise, options.latitude, options.longitude);
  return found ? toUtcDate(found.jd).toISOString() : null;
}

export type IshtakaalResult =
  | {
      status: "calculated";
      sunriseUtc: string;
      nextSunriseUtc: string;
      elapsedMilliseconds: number;
      sunriseIntervalMilliseconds: number;
      ghati: number;
      pala: number;
      vipala: number;
    }
  | { status: "unavailable"; reason: string };

export function calculateIshtakaalFromSunrises(
  instant: Date,
  sunriseInstants: readonly (string | null)[],
): IshtakaalResult {
  if (!(instant instanceof Date) || !Number.isFinite(instant.getTime())) {
    throw new InputError("Ishtakaal requires a valid birth instant.", "INVALID_ISHTAKAAL_INSTANT");
  }
  const uniqueSunrises = [...new Set(sunriseInstants
    .filter((value): value is string => typeof value === "string")
    .map((value) => Date.parse(value))
    .filter(Number.isFinite))]
    .sort((a, b) => a - b);
  const previousSunrise = uniqueSunrises.filter((time) => time <= instant.getTime()).at(-1);
  const nextSunrise = uniqueSunrises.find((time) => time > instant.getTime());
  if (previousSunrise === undefined || nextSunrise === undefined) {
    return {
      status: "unavailable",
      reason: "A real sunrise before and after the birth instant is required.",
    };
  }
  const interval = nextSunrise - previousSunrise;
  const elapsed = instant.getTime() - previousSunrise;
  if (interval <= 0 || elapsed < 0 || elapsed >= interval) {
    return { status: "unavailable", reason: "The surrounding sunrise interval is invalid." };
  }
  const totalVipala = (elapsed / interval) * 60 * 60 * 60;
  const ghati = Math.floor(totalVipala / 3600);
  const remainingVipalaAfterGhati = totalVipala - ghati * 3600;
  const pala = Math.floor(remainingVipalaAfterGhati / 60);
  const vipala = Math.round(remainingVipalaAfterGhati - pala * 60);
  return {
    status: "calculated",
    sunriseUtc: new Date(previousSunrise).toISOString(),
    nextSunriseUtc: new Date(nextSunrise).toISOString(),
    elapsedMilliseconds: elapsed,
    sunriseIntervalMilliseconds: interval,
    ghati,
    pala,
    vipala,
  };
}

export function calculateIshtakaal(input: BirthInput, currentSunriseUtc: string | null): IshtakaalResult {
  const resolved = resolveBirthInput(input);
  const options = {
    localDate: input.localDate,
    timeZone: input.timeZone,
    latitude: input.latitude,
    longitude: input.longitude,
  };
  const previousDate = shiftDate(input.localDate, -1);
  const nextDate = shiftDate(input.localDate, 1);
  const sunriseInstants = [
    sunriseOnLocalDate({ ...options, localDate: previousDate }),
    currentSunriseUtc,
    sunriseOnLocalDate({ ...options, localDate: nextDate }),
  ];
  return calculateIshtakaalFromSunrises(resolved.instant, sunriseInstants);
}

/**
 * Sunrise, sunset, moonrise and moonset for the observer's local calendar date.
 * Each search starts at local midnight, so an event that technically falls on the
 * following local date (common for moonrise) is reported with its true instant and
 * flagged instead of being forced onto the reference date.
 */
export function calculateSunMoonRiseSet(options: RiseSetOptions) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.localDate)) {
    throw new InputError("Rise/set calculation requires a valid YYYY-MM-DD local date.", "INVALID_RISE_SET_DATE");
  }
  setEphemerisPath(ephemerisDirectory());
  const dayStart = zonedDayStart(options.localDate, options.timeZone, options.latitude, options.longitude);
  const jdStart = julianDay(dayStart.getUTCFullYear(), dayStart.getUTCMonth() + 1, dayStart.getUTCDate(), dayStart.getUTCHours() + dayStart.getUTCMinutes() / 60);

  const definitions = [
    { event: "sunrise" as const, body: Planet.Sun, flag: RiseTransitFlag.Rise },
    { event: "sunset" as const, body: Planet.Sun, flag: RiseTransitFlag.Set },
    { event: "moonrise" as const, body: Planet.Moon, flag: RiseTransitFlag.Rise },
    { event: "moonset" as const, body: Planet.Moon, flag: RiseTransitFlag.Set },
  ];
  const events: RiseSetEvent[] = definitions.map(({ event, body, flag }) => {
    const found = riseSetEvent(jdStart, body, flag, options.latitude, options.longitude);
    if (!found) {
      return { event, status: "no-event", utc: null, localTime: null, julianDayUt: null, eventLocalDate: null, occursOnReferenceDate: null, reason: `Swiss swe_rise_trans returned no ${event} for this location and date (circumpolar or no event within the search window).` };
    }
    const utc = toUtcDate(found.jd);
    const eventLocalDate = localDateInZone(utc, options.timeZone);
    return {
      event,
      status: "calculated" as const,
      utc: utc.toISOString(),
      localTime: formatInZone(utc, options.timeZone),
      julianDayUt: found.jd,
      eventLocalDate,
      occursOnReferenceDate: eventLocalDate === options.localDate,
      reason: null,
    };
  });
  return {
    referenceDate: options.localDate,
    timeZone: options.timeZone,
    latitude: options.latitude,
    longitude: options.longitude,
    sunrise: events[0],
    sunset: events[1],
    moonrise: events[2],
    moonset: events[3],
    convention: RISE_SET_LIMITATION,
    library: "Swiss Ephemeris swe_rise_trans",
  };
}

export type VaraResult = {
  civilWeekday: string;
  sunriseBasedVara: string | null;
  status: "calculated" | "unavailable";
  sunriseUtc: string | null;
  sunriseLocalTime: string | null;
  rule: string;
  reason: string | null;
};

/**
 * Sunrise-based Vara (Hindu weekday). A vara runs from one sunrise to the next, so
 * an instant before its own local date's sunrise belongs to the previous day's vara.
 */
export function calculateVara(instant: Date, options: RiseSetOptions): VaraResult {
  const civilWeekday = localWeekdayInZone(instant, options.timeZone);
  const civilDate = localDateInZone(instant, options.timeZone);
  const rule = "Vara runs sunrise-to-sunrise: the running vara is the weekday of the most recent sunrise at the observer's location (previous local date if the instant precedes its own sunrise).";
  setEphemerisPath(ephemerisDirectory());
  const sunriseFor = (dateString: string) => {
    const dayStart = zonedDayStart(dateString, options.timeZone, options.latitude, options.longitude);
    const jdStart = julianDay(dayStart.getUTCFullYear(), dayStart.getUTCMonth() + 1, dayStart.getUTCDate(), dayStart.getUTCHours() + dayStart.getUTCMinutes() / 60);
    const found = riseSetEvent(jdStart, Planet.Sun, RiseTransitFlag.Rise, options.latitude, options.longitude);
    return found ? toUtcDate(found.jd) : null;
  };
  const todaySunrise = sunriseFor(civilDate);
  if (!todaySunrise) {
    return { civilWeekday, sunriseBasedVara: null, status: "unavailable", sunriseUtc: null, sunriseLocalTime: null, rule, reason: "No sunrise occurs on this local date at this location, so a sunrise-based vara cannot be determined." };
  }
  const anchor = instant.getTime() >= todaySunrise.getTime() ? todaySunrise : sunriseFor(shiftDate(civilDate, -1));
  if (!anchor) {
    return { civilWeekday, sunriseBasedVara: null, status: "unavailable", sunriseUtc: todaySunrise.toISOString(), sunriseLocalTime: formatInZone(todaySunrise, options.timeZone), rule, reason: "No sunrise occurs on the previous local date at this location, so the running vara cannot be determined." };
  }
  return {
    civilWeekday,
    sunriseBasedVara: localWeekdayInZone(anchor, options.timeZone),
    status: "calculated",
    sunriseUtc: anchor.toISOString(),
    sunriseLocalTime: formatInZone(anchor, options.timeZone),
    rule,
    reason: null,
  };
}

export type TransitBody = { name: string; body: number; longitude: number };
const TRANSIT_BODIES: TransitBody[] = [
  { name: "Sun", body: Planet.Sun, longitude: 0 },
  { name: "Moon", body: Planet.Moon, longitude: 0 },
  { name: "Mercury", body: Planet.Mercury, longitude: 0 },
  { name: "Venus", body: Planet.Venus, longitude: 0 },
  { name: "Mars", body: Planet.Mars, longitude: 0 },
  { name: "Jupiter", body: Planet.Jupiter, longitude: 0 },
  { name: "Saturn", body: Planet.Saturn, longitude: 0 },
  { name: "Rahu", body: LunarPoint.TrueNode, longitude: 0 },
  { name: "Ketu", body: LunarPoint.TrueNode, longitude: 180 },
];

function siderealLongitudeAt(jd: number, body: number, ayanamsa: AyanamsaName, offset: number): number {
  setSiderealMode(AYANAMSA_MODES[ayanamsa]);
  const position = calculatePosition(jd, body, CalculationFlag.SwissEphemeris | CalculationFlag.Sidereal);
  if ((position.flags & CalculationFlag.SwissEphemeris) === 0) {
    throw new InputError("Transit calculation could not use the local Swiss Ephemeris files.", "TRANSIT_EPHEMERIS_UNAVAILABLE");
  }
  return wrap(position.longitude + offset);
}

function describeLongitude(longitude: number) {
  const normalized = wrap(longitude);
  const signIndex = Math.floor(normalized / 30);
  const nakshatraIndex = Math.min(26, Math.floor((normalized + 1e-10) / (360 / 27)));
  const withinNakshatra = normalized - nakshatraIndex * (360 / 27);
  return {
    longitude: normalized,
    sign: SIGNS[signIndex],
    signIndex,
    nakshatra: NAKSHATRAS[nakshatraIndex],
    pada: Math.min(4, Math.floor((withinNakshatra + 1e-10) / (360 / 108)) + 1),
  };
}

function signIndexAt(jd: number, entry: TransitBody, ayanamsa: AyanamsaName): number {
  return Math.floor(siderealLongitudeAt(jd, entry.body, ayanamsa, entry.longitude) / 30);
}

const INGRESS_STEP_DAYS: Record<string, number> = { Moon: 0.25, Sun: 1, Mercury: 1, Venus: 1, Mars: 2, Jupiter: 5, Saturn: 5, Rahu: 5, Ketu: 5 };

function nextSignIngress(jd0: number, entry: TransitBody, ayanamsa: AyanamsaName, horizonDays: number) {
  const step = INGRESS_STEP_DAYS[entry.name] ?? 2;
  const startSign = signIndexAt(jd0, entry, ayanamsa);
  let previousJd = jd0;
  let previousSign = startSign;
  for (let offset = step; offset <= horizonDays; offset += step) {
    const jd = jd0 + offset;
    const sign = signIndexAt(jd, entry, ayanamsa);
    if (sign !== previousSign) {
      // Bisect the sign transition to sub-second resolution.
      let low = previousJd;
      let high = jd;
      for (let iteration = 0; iteration < 60 && high - low > 1e-7; iteration++) {
        const middle = (low + high) / 2;
        if (signIndexAt(middle, entry, ayanamsa) === startSign) low = middle;
        else high = middle;
      }
      return { jd, transitionJd: high, fromSign: previousSign, toSign: sign, precisionDays: high - low };
    }
    previousJd = jd;
    previousSign = sign;
  }
  return null;
}

/**
 * Transit snapshot and the next sidereal sign-ingress for each supported body.
 * Ingress times are root-refined by bisection on the sidereal sign boundary; the
 * reported precision is the achieved interval, never a guessed time.
 */
export function calculateTransits(instant: Date, options: { ayanamsa?: AyanamsaName; horizonDays?: number } = {}) {
  if (!(instant instanceof Date) || !Number.isFinite(instant.getTime())) {
    throw new InputError("Transit calculation requires a valid UTC instant.", "INVALID_TRANSIT_INSTANT");
  }
  setEphemerisPath(ephemerisDirectory());
  const ayanamsa = options.ayanamsa ?? "Lahiri";
  const horizonDays = options.horizonDays ?? 900;
  if (!Object.hasOwn(AYANAMSA_MODES, ayanamsa)) {
    throw new InputError("Transit calculation requires a supported ayanamsa.", "INVALID_TRANSIT_AYANAMSA");
  }
  if (!Number.isFinite(horizonDays) || horizonDays <= 0) {
    throw new InputError("Transit search horizon must be a finite positive number of days.", "INVALID_TRANSIT_HORIZON");
  }
  const jdUtc = julianDay(instant.getUTCFullYear(), instant.getUTCMonth() + 1, instant.getUTCDate(), instant.getUTCHours() + instant.getUTCMinutes() / 60 + instant.getUTCSeconds() / 3600);
  const bodies = TRANSIT_BODIES.map((entry) => {
    const position = describeLongitude(siderealLongitudeAt(jdUtc, entry.body, ayanamsa, entry.longitude));
    const ingress = nextSignIngress(jdUtc, entry, ayanamsa, horizonDays);
    return {
      name: entry.name,
      ...position,
      nextSignIngress: ingress ? {
        utc: toUtcDate(ingress.transitionJd).toISOString(),
        fromSign: SIGNS[ingress.fromSign],
        toSign: SIGNS[ingress.toSign],
        direction: ingress.toSign === (ingress.fromSign + 1) % 12 ? "direct" : "retrograde",
        refinementDays: ingress.precisionDays,
      } : null,
    };
  });
  return {
    instantUtc: instant.toISOString(),
    ayanamsa,
    horizonDays,
    bodies,
    method: "Sidereal longitudes from the local Swiss Ephemeris binding; next sign-ingress located by forward scanning then bisection on the sidereal sign boundary until the bracket is below 1e-7 days (~8.6 ms).",
    limitations: ["Only sign-ingress of the listed bodies within the search horizon is reported; no other event types are inferred.", "Times inherit the UTC-used-as-UT1 approximation documented for the chart engine."],
  };
}
