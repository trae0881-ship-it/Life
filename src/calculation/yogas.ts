import { InputError } from "./time.ts";

/**
 * Yogas, doshas, planetary dignity and Parashari aspects.
 *
 * Everything here is a pure function of sidereal longitudes plus the ascendant.
 * Houses used for yoga/dosha detection are rasi (sign) houses counted from the
 * ascendant sign, which is the classical basis for these rules. Each result
 * carries the literal rule that produced it so nothing is asserted without a
 * stated convention.
 */

export const YOGA_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const CLASSICAL_PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
const NODES = ["Rahu", "Ketu"];
const BENEFICS = new Set(["Jupiter", "Venus", "Mercury"]);
const KENDRA = [1, 4, 7, 10];

const wrap = (value: number) => ((value % 360) + 360) % 360;
const signOf = (longitude: number) => Math.min(11, Math.floor((wrap(longitude) + 1e-10) / 30));
const ordinal = (n: number) => {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = n % 100;
  return `${n}${suffixes[(value - 20) % 10] ?? suffixes[value] ?? suffixes[0]}`;
};

// Exaltation sign index (deep degree) and the sign each body rules.
type ExaltationTable = Record<string, { sign: number; degree: number }>;
type OwnSignTable = Record<string, number[]>;
type MoolatrikonaTable = Record<string, { sign: number; from: number; to: number }>;
const EXALTATION: ExaltationTable = { Sun: { sign: 0, degree: 10 }, Moon: { sign: 1, degree: 3 }, Mars: { sign: 9, degree: 28 }, Mercury: { sign: 5, degree: 15 }, Jupiter: { sign: 3, degree: 5 }, Venus: { sign: 11, degree: 27 }, Saturn: { sign: 6, degree: 20 } };
const OWN_SIGNS: OwnSignTable = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
const MOOLATRIKONA: MoolatrikonaTable = { Sun: { sign: 4, from: 0, to: 20 }, Moon: { sign: 1, from: 3, to: 30 }, Mars: { sign: 0, from: 0, to: 12 }, Mercury: { sign: 5, from: 15, to: 20 }, Jupiter: { sign: 8, from: 0, to: 10 }, Venus: { sign: 6, from: 0, to: 15 }, Saturn: { sign: 10, from: 0, to: 20 } };
// Combustion orbs (degrees of elongation from the Sun); a tighter retrograde orb is used for Mercury and Venus.
const COMBUSTION: Record<string, number> = { Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 15 };
const COMBUSTION_RETROGRADE: Record<string, number> = { Mercury: 12, Venus: 8 };

// Natural (naisargika) friendship of each planet towards the lord of the sign it occupies.
type FriendshipTable = Record<string, { friends: string[]; enemies: string[] }>;
const NATURAL_FRIENDS: FriendshipTable = {
  Sun: { friends: ["Moon", "Mars", "Jupiter"], enemies: ["Venus", "Saturn"] },
  Moon: { friends: ["Sun", "Mercury"], enemies: [] },
  Mars: { friends: ["Sun", "Moon", "Jupiter"], enemies: ["Mercury"] },
  Mercury: { friends: ["Sun", "Venus"], enemies: ["Moon"] },
  Jupiter: { friends: ["Sun", "Moon", "Mars"], enemies: ["Mercury", "Venus"] },
  Venus: { friends: ["Mercury", "Saturn"], enemies: ["Sun", "Moon"] },
  Saturn: { friends: ["Mercury", "Venus"], enemies: ["Sun", "Moon", "Mars"] },
};
const SIGN_LORDS = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];

// Parashari full-strength graha drishti: houses counted from the aspecting planet.
const ASPECT_HOUSES: Record<string, number[]> = { Sun: [7], Moon: [7], Mercury: [7], Venus: [7], Mars: [4, 7, 8], Jupiter: [5, 7, 9], Saturn: [3, 7, 10], Rahu: [5, 7, 9], Ketu: [5, 7, 9] };

const KAAL_SARPA_TYPES = ["Anant", "Kulik", "Vasuki", "Shankhpal", "Padma", "Mahapadma", "Takshak", "Karkotak", "Shankhachur", "Ghatak", "Vishdhar", "Sheshnag"];

export type YogaPlanet = { name: string; longitude: number; speed?: number };
export type YogaInput = { ascendantLongitude: number; planets: YogaPlanet[] };

function angularDistance(a: number, b: number) {
  const diff = Math.abs(wrap(a) - wrap(b));
  return diff > 180 ? 360 - diff : diff;
}

function relationship(planet: string, signLord: string) {
  const table = NATURAL_FRIENDS[planet];
  if (!table) return "Node (no natural friendship)";
  if (planet === signLord) return "Own sign";
  if (table.friends.includes(signLord)) return "Friendly";
  if (table.enemies.includes(signLord)) return "Enemy";
  return "Neutral";
}

/** Planetary dignity in the sidereal zodiac: exaltation, moolatrikona, own sign, friendship, combustion and retrogression. */
export function calculatePlanetaryDignity(planets: YogaPlanet[]) {
  if (!Array.isArray(planets) || planets.length === 0 || !planets.every((planet) => typeof planet.name === "string" && Number.isFinite(planet.longitude))) {
    throw new InputError("Planetary dignity requires a non-empty list of named planets with finite longitudes.", "INVALID_DIGNITY_INPUT");
  }
  const sun = planets.find((planet) => planet.name === "Sun");
  const retrograde = (name: string) => {
    const planet = planets.find((entry) => entry.name === name);
    return typeof planet?.speed === "number" ? planet.speed < 0 : null;
  };

  return planets.map((planet) => {
    const signIndex = signOf(planet.longitude);
    const degreesInSign = wrap(planet.longitude) - signIndex * 30;
    const exaltation = EXALTATION[planet.name];
    const mool = MOOLATRIKONA[planet.name];
    const own = OWN_SIGNS[planet.name] ?? [];
    let dignity: string;
    if (exaltation && exaltation.sign === signIndex) dignity = "Exalted";
    else if (mool && mool.sign === signIndex && degreesInSign >= mool.from && degreesInSign < mool.to) dignity = "Moolatrikona";
    else if (own.includes(signIndex)) dignity = "Own sign";
    else if (exaltation && (exaltation.sign + 6) % 12 === signIndex) dignity = "Debilitated";
    else dignity = relationship(planet.name, SIGN_LORDS[signIndex]);

    const isRetrograde = retrograde(planet.name);
    let combust: boolean | null = null;
    if (sun && planet.name !== "Sun" && COMBUSTION[planet.name]) {
      const limit = isRetrograde ? (COMBUSTION_RETROGRADE[planet.name] ?? COMBUSTION[planet.name]) : COMBUSTION[planet.name];
      combust = angularDistance(planet.longitude, sun.longitude) < limit;
    }
    return {
      name: planet.name,
      sign: YOGA_SIGNS[signIndex],
      signIndex,
      degreesInSign: Number(degreesInSign.toFixed(4)),
      signLord: SIGN_LORDS[signIndex],
      dignity,
      combust,
      retrograde: isRetrograde,
    };
  });
}

/** Parashari graha drishti: for each planet, the houses and planets it aspects. */
export function calculateGrahaAspects(planets: YogaPlanet[], ascendantSignIndex: number) {
  if (!Number.isInteger(ascendantSignIndex) || ascendantSignIndex < 0 || ascendantSignIndex > 11) {
    throw new InputError("Aspect calculation requires an ascendant sign index from 0 to 11.", "INVALID_ASCENDANT_SIGN");
  }
  const signByPlanet = new Map(planets.map((planet) => [planet.name, signOf(planet.longitude)]));
  const details = planets.map((planet) => {
    const sign = signOf(planet.longitude);
    const house = ((sign - ascendantSignIndex + 12) % 12) + 1;
    const aspects = (ASPECT_HOUSES[planet.name] ?? [7]).map((offset) => ((house - 1 + offset - 1) % 12) + 1);
    const aspectedPlanets = planets
      .filter((other) => other.name !== planet.name && aspects.includes(((signOf(other.longitude) - ascendantSignIndex + 12) % 12) + 1))
      .map((other) => other.name);
    return { name: planet.name, house, aspectsHouses: aspects.sort((a, b) => a - b), aspectsPlanets: aspectedPlanets.sort() };
  });
  return {
    convention: "Parashari full-strength drishti: all bodies aspect the 7th; Mars also 4th and 8th; Jupiter also 5th and 9th; Saturn also 3rd and 10th; Rahu and Ketu use 5th/7th/9th (convention-dependent).",
    details,
  };
}

export type YogaFinding = { id: string; name: string; category: "yoga" | "dosha"; present: boolean; rule: string; planets: string[]; detail?: string };

/** Nabhasa/other yogas and common doshas detected from rasi houses. */
export function calculateYogasAndDoshas(input: YogaInput): YogaFinding[] {
  if (!input || !Number.isFinite(input.ascendantLongitude) || !Array.isArray(input.planets)) {
    throw new InputError("Yoga calculation requires an ascendant longitude and a planet list.", "INVALID_YOGA_INPUT");
  }
  const ascSign = signOf(input.ascendantLongitude);
  const present = new Set(input.planets.map((planet) => planet.name));
  const longitude = new Map(input.planets.map((planet) => [planet.name, wrap(planet.longitude)]));
  const sign = (name: string) => (longitude.has(name) ? signOf(longitude.get(name)!) : null);
  const houseFrom = (name: string, referenceSign: number) => {
    const value = sign(name);
    return value === null ? null : ((value - referenceSign + 12) % 12) + 1;
  };
  const houseFromAsc = (name: string) => houseFrom(name, ascSign);
  const houseFromMoon = (name: string) => (present.has("Moon") ? houseFrom(name, sign("Moon")!) : null);
  const houseFromSun = (name: string) => (present.has("Sun") ? houseFrom(name, sign("Sun")!) : null);
  const findings: YogaFinding[] = [];
  const add = (finding: Omit<YogaFinding, "present"> & { present?: boolean }) => findings.push({ present: finding.present ?? true, ...finding });

  // --- Nabhasa / Moon-based yogas ---
  const moonSign = sign("Moon");
  if (moonSign !== null) {
    const others = input.planets.filter((planet) => !["Moon", "Sun"].includes(planet.name));
    const in2 = others.filter((planet) => houseFromMoon(planet.name) === 2).map((planet) => planet.name);
    const in12 = others.filter((planet) => houseFromMoon(planet.name) === 12).map((planet) => planet.name);
    const withMoon = others.filter((planet) => sign(planet.name) === moonSign).map((planet) => planet.name);
    add({ id: "kemadruma", name: "Kemadruma Yoga", category: "dosha", present: in2.length === 0 && in12.length === 0 && withMoon.length === 0, rule: "No planet except the Sun occupies the 2nd, the 12th, or the Moon's own sign (counted from the Moon).", planets: ["Moon"] });
    add({ id: "sunapha", name: "Sunapha Yoga", category: "yoga", present: in2.length > 0 && in12.length === 0, rule: "Planets (excluding the Sun) occupy the 2nd house from the Moon and none the 12th.", planets: in2 });
    add({ id: "anapha", name: "Anapha Yoga", category: "yoga", present: in12.length > 0 && in2.length === 0, rule: "Planets (excluding the Sun) occupy the 12th house from the Moon and none the 2nd.", planets: in12 });
    add({ id: "durudhara", name: "Durudhara Yoga", category: "yoga", present: in2.length > 0 && in12.length > 0, rule: "Planets occupy both the 2nd and the 12th houses from the Moon.", planets: [...in2, ...in12] });
    add({ id: "chandra-mangala", name: "Chandra-Mangala Yoga", category: "yoga", present: present.has("Mars") && sign("Mars") === moonSign, rule: "Moon and Mars occupy the same sign.", planets: ["Moon", "Mars"] });
    const gajaPresent = present.has("Jupiter") && KENDRA.includes(houseFromMoon("Jupiter") ?? 0);
    add({ id: "gajakesari", name: "Gajakesari Yoga", category: "yoga", present: gajaPresent, rule: "Jupiter is in a kendra (1/4/7/10) from the Moon.", planets: ["Moon", "Jupiter"], detail: gajaPresent ? `Jupiter is in the ${houseFromMoon("Jupiter")}th from the Moon.` : undefined });
    const beneficsInAdhi = input.planets.filter((planet) => BENEFICS.has(planet.name) && [6, 7, 8].includes(houseFromMoon(planet.name) ?? 0)).map((planet) => planet.name);
    add({ id: "adhi", name: "Adhi Yoga", category: "yoga", present: beneficsInAdhi.length >= 1, rule: "Natural benefics (Jupiter/Venus/Mercury) occupy the 6th, 7th or 8th from the Moon.", planets: beneficsInAdhi });
  }
  if (present.has("Jupiter") && present.has("Moon")) {
    const jupHouse = houseFromMoon("Jupiter")!;
    add({ id: "shakata", name: "Shakata Yoga", category: "dosha", present: [6, 8, 12].includes(jupHouse), rule: "The Moon and Jupiter are in the 6th, 8th or 12th from each other.", planets: ["Moon", "Jupiter"] });
  }

  // --- Sun-based yogas ---
  const sunSign = sign("Sun");
  if (sunSign !== null) {
    const nonMoon = input.planets.filter((planet) => planet.name !== "Moon");
    const vesi = nonMoon.filter((planet) => houseFromSun(planet.name) === 2).map((planet) => planet.name);
    const vasi = nonMoon.filter((planet) => houseFromSun(planet.name) === 12).map((planet) => planet.name);
    add({ id: "vesi", name: "Vesi Yoga", category: "yoga", present: vesi.length > 0 && vasi.length === 0, rule: "Planets (excluding the Moon) occupy the 2nd house from the Sun.", planets: vesi });
    add({ id: "vasi", name: "Vasi Yoga", category: "yoga", present: vasi.length > 0 && vesi.length === 0, rule: "Planets (excluding the Moon) occupy the 12th house from the Sun.", planets: vasi });
    add({ id: "ubhayachari", name: "Ubhayachari Yoga", category: "yoga", present: vesi.length > 0 && vasi.length > 0, rule: "Planets occupy both the 2nd and the 12th houses from the Sun.", planets: [...vesi, ...vasi] });
    add({ id: "budhaditya", name: "Budhaditya Yoga", category: "yoga", present: present.has("Mercury") && sign("Mercury") === sunSign, rule: "The Sun and Mercury occupy the same sign.", planets: ["Sun", "Mercury"] });
  }

  // --- Pancha Mahapurusha Yogas: kendra placement in own / exaltation / moolatrikona sign ---
  const mahapurusha = [
    { planet: "Mars", name: "Ruchaka Yoga" },
    { planet: "Mercury", name: "Bhadra Yoga" },
    { planet: "Jupiter", name: "Hamsa Yoga" },
    { planet: "Venus", name: "Malavya Yoga" },
    { planet: "Saturn", name: "Shasha Yoga" },
  ];
  for (const { planet, name } of mahapurusha) {
    if (!present.has(planet)) continue;
    const planetSign = sign(planet)!;
    const inKendra = KENDRA.includes(houseFromAsc(planet) ?? 0);
    const strong = EXALTATION[planet]?.sign === planetSign || (OWN_SIGNS[planet] ?? []).includes(planetSign) || (MOOLATRIKONA[planet] && MOOLATRIKONA[planet].sign === planetSign);
    add({ id: `mahapurusha-${planet.toLowerCase()}`, name, category: "yoga", present: Boolean(inKendra && strong), rule: `${planet} occupies its own, exaltation or moolatrikona sign while placed in a kendra (1/4/7/10) from the ascendant.`, planets: [planet] });
  }

  // --- Amala Yoga: a natural benefic in the 10th from the Moon or the ascendant ---
  const amala = input.planets.filter((planet) => BENEFICS.has(planet.name) && (houseFromAsc(planet.name) === 10 || houseFromMoon(planet.name) === 10)).map((planet) => planet.name);
  add({ id: "amala", name: "Amala Yoga", category: "yoga", present: amala.length > 0, rule: "A natural benefic (Jupiter/Venus/Mercury) occupies the 10th house from the Moon or the ascendant.", planets: amala });

  // --- Doshas ---
  const kujaHouses = [1, 2, 4, 7, 8, 12];
  const marsFromAsc = houseFromAsc("Mars");
  const marsFromMoon = houseFromMoon("Mars");
  const kuja = present.has("Mars") && (kujaHouses.includes(marsFromAsc ?? 0) || kujaHouses.includes(marsFromMoon ?? 0));
  add({ id: "mangal-dosha", name: "Mangal (Kuja) Dosha", category: "dosha", present: Boolean(kuja), rule: "Mars occupies the 1st, 2nd, 4th, 7th, 8th or 12th house from the ascendant or from the Moon.", planets: ["Mars"], detail: kuja ? `Mars is ${ordinal(marsFromAsc ?? 0)} from the ascendant and ${ordinal(marsFromMoon ?? 0)} from the Moon.` : undefined });

  const nodeSameSign = (body: string) => NODES.filter((node) => present.has(node) && sign(node) === sign(body));
  const grahan = [...nodeSameSign("Sun"), ...nodeSameSign("Moon")];
  add({ id: "grahan-dosha", name: "Grahan Dosha", category: "dosha", present: grahan.length > 0, rule: "The Sun or the Moon occupies the same sign as Rahu or Ketu.", planets: grahan });

  const shrapit = present.has("Saturn")
    ? NODES.filter((node) => present.has(node) && sign(node) === sign("Saturn"))
    : [];
  add({ id: "shrapit-dosha", name: "Shrapit Dosha", category: "dosha", present: shrapit.length > 0, rule: "Saturn and Rahu (or Ketu) occupy the same sign.", planets: ["Saturn", ...shrapit] });

  const ninthAfflicted = [...NODES, "Saturn"].filter((name) => present.has(name) && houseFromAsc(name) === 9);
  const pitra = nodeSameSign("Sun").length > 0 || ninthAfflicted.length > 0;
  add({ id: "pitra-dosha", name: "Pitra Dosha", category: "dosha", present: pitra, rule: "The Sun shares a sign with Rahu/Ketu, or Rahu/Ketu/Saturn occupy the 9th house from the ascendant.", planets: [...nodeSameSign("Sun"), ...ninthAfflicted] });

  if (present.has("Rahu") && present.has("Ketu")) {
    const rahu = longitude.get("Rahu")!;
    const offsets = CLASSICAL_PLANETS.filter((name) => present.has(name)).map((name) => wrap(longitude.get(name)! - rahu));
    const inFirstHalf = offsets.filter((offset) => offset > 1e-6 && offset < 180 - 1e-6).length;
    const inSecondHalf = offsets.filter((offset) => offset > 180 + 1e-6).length;
    const total = offsets.length;
    const kaalSarpa = total > 0 && (inFirstHalf === total || inSecondHalf === total);
    const rahuHouse = houseFromAsc("Rahu") ?? 1;
    add({ id: "kaal-sarpa", name: "Kaal Sarpa Dosha", category: "dosha", present: kaalSarpa, rule: "All seven classical planets lie within the 180° arc on one side of the Rahu–Ketu axis.", planets: ["Rahu", "Ketu"], detail: kaalSarpa ? `${KAAL_SARPA_TYPES[rahuHouse - 1]} form (Rahu in the ${ordinal(rahuHouse)} house).` : undefined });
  }

  return findings;
}
