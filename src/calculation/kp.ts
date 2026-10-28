import { InputError } from "./time.ts";

/**
 * Krishnamurti Paddhati (KP) astrology.
 *
 * This module is deliberately pure: it consumes already-computed sidereal
 * longitudes (KP uses the Krishnamurti ayanamsa) and Placidus cusp longitudes,
 * and applies the KP star/sub/sub-sub division and significator rules. It makes
 * no ephemeris calls itself, so it can be unit tested against hand-computed
 * boundaries without touching the native binding.
 */

export const KP_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
export const KP_NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];

// Vimshottari order used for nakshatra lords, subs and sub-subs.
export const KP_VIMSHOTTARI_LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"] as const;
export const KP_VIMSHOTTARI_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17] as const;
export type KpLord = (typeof KP_VIMSHOTTARI_LORDS)[number];

// Sign rulers (Rahu and Ketu own no sign in KP and act through their dispositors).
export const KP_SIGN_LORDS = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
const NODE_NAMES = new Set(["Rahu", "Ketu"]);

const NAKSHATRA_SPAN = 360 / 27; // 13°20'
const wrap = (value: number) => ((value % 360) + 360) % 360;
const round = (value: number, places = 6) => Number(value.toFixed(places));

export type KpLordChain = {
  longitude: number;
  sign: string;
  signIndex: number;
  signLord: string;
  nakshatra: { name: string; index: number; lord: string; pada: number; startDegrees: number; spanDegrees: number };
  sub: { lord: KpLord; index: number; startDegrees: number; spanDegrees: number };
  subSub: { lord: KpLord; index: number; startDegrees: number; spanDegrees: number };
};

/**
 * Resolve the sign, sign lord, nakshatra (star) lord, sub lord and sub-sub lord
 * for a sidereal longitude. Subs and sub-subs are the nakshatra (and sub) split
 * into nine Vimshottari-proportional segments starting from the parent lord.
 */
export function calculateKpLordChain(siderealLongitude: number): KpLordChain {
  if (!Number.isFinite(siderealLongitude)) {
    throw new InputError("KP lord chain requires a finite sidereal longitude.", "INVALID_KP_LONGITUDE");
  }
  const longitude = wrap(siderealLongitude);
  const signIndex = Math.min(11, Math.floor((longitude + 1e-10) / 30));
  const nakshatraIndex = Math.min(26, Math.floor((longitude + 1e-10) / NAKSHATRA_SPAN));
  const withinNakshatra = longitude - nakshatraIndex * NAKSHATRA_SPAN;
  const starLordIndex = nakshatraIndex % 9;

  const sub = splitVimshottari(withinNakshatra, NAKSHATRA_SPAN, starLordIndex);
  const subSub = splitVimshottari(sub.offset, sub.span, sub.index);

  return {
    longitude,
    sign: KP_SIGNS[signIndex],
    signIndex,
    signLord: KP_SIGN_LORDS[signIndex],
    nakshatra: {
      name: KP_NAKSHATRAS[nakshatraIndex],
      index: nakshatraIndex,
      lord: KP_VIMSHOTTARI_LORDS[starLordIndex],
      pada: Math.min(4, Math.floor((withinNakshatra + 1e-10) / (NAKSHATRA_SPAN / 4)) + 1),
      startDegrees: round(nakshatraIndex * NAKSHATRA_SPAN),
      spanDegrees: round(NAKSHATRA_SPAN),
    },
    sub: { lord: KP_VIMSHOTTARI_LORDS[sub.index], index: sub.index, startDegrees: round(nakshatraIndex * NAKSHATRA_SPAN + sub.start), spanDegrees: round(sub.span) },
    subSub: { lord: KP_VIMSHOTTARI_LORDS[subSub.index], index: subSub.index, startDegrees: round(nakshatraIndex * NAKSHATRA_SPAN + sub.start + subSub.start), spanDegrees: round(subSub.span) },
  };
}

function splitVimshottari(offsetWithinParent: number, parentSpan: number, startLordIndex: number) {
  let cursor = 0;
  for (let step = 0; step < 9; step++) {
    const index = (startLordIndex + step) % 9;
    const span = (KP_VIMSHOTTARI_YEARS[index] / 120) * parentSpan;
    const isLast = step === 8;
    // Segment is [start, end): a longitude exactly on a boundary belongs to the
    // segment that starts there. The epsilon is applied to the offset so an
    // accumulated floating-point overshoot does not steal the boundary value.
    if (offsetWithinParent + 1e-9 < cursor + span || isLast) {
      return { index, start: cursor, span, offset: Math.max(0, offsetWithinParent - cursor) };
    }
    cursor += span;
  }
  // Unreachable: the loop always returns on the final iteration.
  return { index: startLordIndex, start: 0, span: parentSpan, offset: 0 };
}

export type KpPlanetInput = { name: string; longitude: number };
export type KpSignifications = {
  occupied: number[];
  owned: number[];
  starLordOccupied: number[];
  starLordOwned: number[];
  dispositorOccupied: number[];
  dispositorOwned: number[];
  houses: number[];
};

export type KpCusp = KpLordChain & { house: number; signifiedBy: string[] };

/**
 * Build a KP chart from sidereal longitudes and Placidus cusp longitudes.
 *
 * Significator rules applied per planet (standard KP four-fold rule):
 *   1. houses it occupies,
 *   2. houses it owns (lord of the sign on the cusp),
 *   3. houses occupied by its star (nakshatra) lord,
 *   4. houses owned by its star lord.
 * Rahu and Ketu own no houses; they signify through occupation and their star lord.
 */
export function calculateKpAstrology(input: { planets: KpPlanetInput[]; cusps: number[] }) {
  if (!Array.isArray(input.planets) || input.planets.length === 0) {
    throw new InputError("KP astrology requires at least one planet.", "INVALID_KP_PLANETS");
  }
  if (!Array.isArray(input.cusps) || input.cusps.length !== 12 || !input.cusps.every(Number.isFinite)) {
    throw new InputError("KP astrology requires 12 finite Placidus cusp longitudes.", "INVALID_KP_CUSPS");
  }

  const cusps = input.cusps.map((longitude, index) => ({ house: index + 1, ...calculateKpLordChain(longitude) }));

  const houseOf = (longitude: number) => {
    const target = wrap(longitude);
    for (let index = 0; index < 12; index++) {
      const start = wrap(cusps[index].longitude);
      const end = wrap(cusps[(index + 1) % 12].longitude);
      const span = wrap(end - start) || 360;
      if (wrap(target - start) < span) return index + 1;
    }
    return 1;
  };

  const ownedHouses = (lord: string) => {
    if (NODE_NAMES.has(lord)) return [];
    return cusps.filter((cusp) => cusp.signLord === lord).map((cusp) => cusp.house);
  };

  const positions = new Map(input.planets.map((planet) => [planet.name, wrap(planet.longitude)]));

  const planets = input.planets.map((planet) => {
    const chain = calculateKpLordChain(planet.longitude);
    const occupied = [houseOf(chain.longitude)];
    const owned = ownedHouses(planet.name);
    // Rule 3: the house occupied by the planet's star (nakshatra) lord.
    const starLordPosition = positions.get(chain.nakshatra.lord);
    const starLordOccupied = starLordPosition === undefined ? [] : [houseOf(starLordPosition)];
    const starLordOwned = ownedHouses(chain.nakshatra.lord);
    const dispositor = NODE_NAMES.has(planet.name) ? chain.signLord : undefined;
    const dispositorPosition = dispositor === undefined ? undefined : positions.get(dispositor);
    const dispositorOccupied = dispositorPosition === undefined ? [] : [houseOf(dispositorPosition)];
    const dispositorOwned = dispositor === undefined ? [] : ownedHouses(dispositor);
    const significations: KpSignifications = {
      occupied,
      owned,
      starLordOccupied,
      starLordOwned,
      dispositorOccupied,
      dispositorOwned,
      houses: [...new Set([...occupied, ...owned, ...starLordOccupied, ...starLordOwned, ...dispositorOccupied, ...dispositorOwned])].sort((a, b) => a - b),
    };
    return { name: planet.name, ...chain, house: occupied[0], significations };
  });

  const signifiedBy = (house: number) =>
    planets.filter((planet) => planet.significations.houses.includes(house)).map((planet) => planet.name);

  return {
    system: "Krishnamurti Paddhati (KP)",
    ayanamsa: "Krishnamurti",
    houseSystem: "Placidus",
    convention: {
      starLords: "27 equal sidereal nakshatras; lords cycle Ketu→Venus→Sun→Moon→Mars→Rahu→Jupiter→Saturn→Mercury",
      subLords: "each nakshatra split into 9 Vimshottari-proportional subs starting from the star lord (sub span = star lord years ÷ 120 × 13°20′)",
      subSubLords: "each sub split the same way to give sub-sub (prati) lords",
      significators: "house occupied + houses owned + houses occupied by the star lord + houses owned by the star lord; Rahu/Ketu own no house and additionally signify the houses occupied and owned by the sign dispositor (conjunction/aspect associations are not included)",
      cuspAssignment: "a house spans from its cusp to the next cusp (Placidus)",
    },
    planets,
    cusps: cusps.map((cusp) => ({ ...cusp, signifiedBy: signifiedBy(cusp.house) })),
  };
}
