import {
  calculateHouses,
  calculatePosition,
  getAyanamsaExUt,
  julianDay,
  setSiderealMode,
  setEphemerisPath,
} from "@swisseph/node";
import { CalculationFlag, HouseSystem, LunarPoint, Planet, SiderealMode } from "@swisseph/core";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { type BirthInput, resolveBirthInput } from "./time.ts";
import { calculateDivisionalLongitude, calculatePanchanga, calculateVimshottariDasha } from "./rules.ts";
import { calculateIshtakaal, calculateSunMoonRiseSet, calculateTransits, calculateVara, type AyanamsaName } from "./events.ts";
import { calculateKpAstrology } from "./kp.ts";
import { calculateGrahaAspects, calculatePlanetaryDignity, calculateYogasAndDoshas } from "./yogas.ts";
import { findHouseForLongitude } from "./house-analysis.ts";

const CLASSICAL_PLANETS = new Set(["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]);

const bodies = [
  ["Sun", Planet.Sun], ["Moon", Planet.Moon], ["Mercury", Planet.Mercury],
  ["Venus", Planet.Venus], ["Mars", Planet.Mars], ["Jupiter", Planet.Jupiter],
  ["Saturn", Planet.Saturn], ["Uranus", Planet.Uranus], ["Neptune", Planet.Neptune],
  ["Pluto", Planet.Pluto], ["Mean node", LunarPoint.MeanNode], ["True node", LunarPoint.TrueNode],
] as const;
const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const nakshatras = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
const wrap = (degrees: number) => ((degrees % 360) + 360) % 360;

export class UnsupportedEphemerisDateError extends Error {
  constructor() {
    super("The local Swiss Ephemeris data does not cover this instant. No alternate engine was used.");
    this.name = "UnsupportedEphemerisDateError";
  }
}

export class UnsupportedHouseCalculationError extends Error {
  constructor(houseSystem: string) {
    super(`${houseSystem} houses could not be calculated at this date and latitude. No substitute house system was used.`);
    this.name = "UnsupportedHouseCalculationError";
  }
}

export function zodiac(degrees: number) {
  const longitude = wrap(degrees);
  const signIndex = Math.floor(longitude / 30);
  const inSign = longitude - signIndex * 30;
  const wholeSeconds = Math.floor(inSign * 3600 + 1e-8);
  const nakshatraIndex = Math.min(26, Math.floor((longitude + 1e-10) / (360 / 27)));
  const withinNakshatra = longitude - nakshatraIndex * (360 / 27);
  return {
    longitude,
    sign: signs[signIndex],
    degrees: Math.floor(wholeSeconds / 3600),
    minutes: Math.floor((wholeSeconds % 3600) / 60),
    seconds: wholeSeconds % 60,
    nakshatra: nakshatras[nakshatraIndex],
    pada: Math.min(4, Math.floor((withinNakshatra + 1e-10) / (360 / 108)) + 1),
  };
}

export function calculateBirthChart(input: BirthInput) {
  const resolved = resolveBirthInput(input);
  const manifest = JSON.parse(readFileSync(path.join(process.cwd(), "data", "ephemeris-manifest.json"), "utf8")) as { manifestVersion: number; packageVersion: string; npmTarballIntegrity: string; assets: { filename: string; sha256: string }[] };
  for (const asset of manifest.assets) {
    const bytes = readFileSync(path.join(process.cwd(), "data", "ephemeris", asset.filename));
    if (createHash("sha256").update(bytes).digest("hex").toUpperCase() !== asset.sha256) {
      throw new Error(`Ephemeris asset integrity check failed: ${asset.filename}`);
    }
  }
  const utc = resolved.instant;
  const hour = utc.getUTCHours() + utc.getUTCMinutes() / 60 + utc.getUTCSeconds() / 3600;
  const jdUtc = julianDay(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate(), hour);
  // LIFE passes UTC to Swiss Ephemeris' Universal Time input without a DUT1 correction.
  const jdUt = jdUtc;
  const flags = CalculationFlag.SwissEphemeris | CalculationFlag.Speed;
  const siderealFlags = flags | CalculationFlag.Sidereal;
  setEphemerisPath(path.join(process.cwd(), "data", "ephemeris"));
  const ayanamsaOptions = { Lahiri: SiderealMode.Lahiri, Raman: SiderealMode.Raman, Krishnamurti: SiderealMode.Krishnamurti } as const;
  const ayanamsaName = input.ayanamsa ?? "Lahiri";
  const houseOptions = { WholeSign: HouseSystem.WholeSign, Placidus: HouseSystem.Placidus, Koch: HouseSystem.Koch, Equal: HouseSystem.Equal } as const;
  const houseName = input.houseSystem ?? "WholeSign";
  const nodeMode = input.nodeMode ?? "both";
  setSiderealMode(ayanamsaOptions[ayanamsaName]);
  const ayanamsa = getAyanamsaExUt(jdUt, CalculationFlag.SwissEphemeris);
  const activeBodies = bodies.filter(([name]) => nodeMode === "both" || (nodeMode === "mean" ? name !== "True node" : name !== "Mean node"));
  const planets = activeBodies.map(([name, body]) => {
    const tropical = calculatePosition(jdUt, body, flags);
    if ((tropical.flags & CalculationFlag.SwissEphemeris) === 0) {
      throw new UnsupportedEphemerisDateError();
    }
    const sidereal = calculatePosition(jdUt, body, siderealFlags);
    if ((sidereal.flags & CalculationFlag.SwissEphemeris) === 0) throw new UnsupportedEphemerisDateError();
    if (![tropical.longitude, sidereal.longitude, tropical.latitude, sidereal.latitude, sidereal.distance, sidereal.longitudeSpeed].every(Number.isFinite) || tropical.longitude < 0 || tropical.longitude >= 360 || sidereal.longitude < 0 || sidereal.longitude >= 360) {
      throw new Error(`Astronomical result range check failed for ${name}.`);
    }
    const coordinate = zodiac(sidereal.longitude);
    const expectedSidereal = wrap(tropical.longitude - ayanamsa);
    if (Math.abs((((expectedSidereal - coordinate.longitude) + 540) % 360) - 180) > 0.00001) {
      throw new Error(`Tropical/sidereal consistency check failed for ${name}.`);
    }
    return {
      name,
      ...coordinate,
      tropicalLongitude: tropical.longitude,
      siderealLongitude: sidereal.longitude,
      latitude: sidereal.latitude,
      distanceAu: sidereal.distance,
      longitudeSpeed: sidereal.longitudeSpeed,
      motion: sidereal.longitudeSpeed < 0 ? "Retrograde" : "Direct",
      returnedFlags: sidereal.flags,
    };
  });
  let calculatedHouses;
  try {
    calculatedHouses = calculateHouses(jdUt, input.latitude, input.longitude, houseOptions[houseName]);
  } catch {
    throw new UnsupportedHouseCalculationError(houseName);
  }
  const ascendant = zodiac(calculatedHouses.ascendant - ayanamsa);
  const mc = zodiac(calculatedHouses.mc - ayanamsa);
  const firstSignIndex = Math.floor(ascendant.longitude / 30);
  const cusps = houseName === "WholeSign"
    ? Array.from({ length: 12 }, (_, index) => ((firstSignIndex + index) * 30) % 360)
    : calculatedHouses.cusps.slice(1, 13).map((cusp) => wrap(cusp - ayanamsa));
  if (cusps.length !== 12 || cusps.some((cusp) => !Number.isFinite(cusp))) throw new UnsupportedHouseCalculationError(houseName);
  const houses = cusps.map((cuspLongitude, index) => ({ house: index + 1, sign: signs[Math.floor(cuspLongitude / 30)], cuspLongitude }));
  const nodeCounterparts = planets
    .filter((planet) => planet.name === "Mean node" || planet.name === "True node")
    .map((node) => {
      const siderealLongitude = wrap(node.siderealLongitude + 180);
      const coordinate = zodiac(siderealLongitude);
      return {
        ...node,
        name: node.name === "Mean node" ? "Mean Ketu" : "True Ketu",
        ...coordinate,
        tropicalLongitude: wrap(node.tropicalLongitude + 180),
        siderealLongitude,
        latitude: 0,
      };
    });
  const positionsWithHouses = [...planets, ...nodeCounterparts].map((planet) => {
    const house = findHouseForLongitude(cusps, planet.longitude);
    if (house === null) throw new Error("House placement consistency check failed.");
    return { ...planet, house };
  });
  if (![ascendant.longitude, mc.longitude].every(Number.isFinite) || houses.some((house) => !Number.isFinite(house.cuspLongitude)) || positionsWithHouses.some((planet) => planet.house < 1 || planet.house > 12)) {
    throw new Error("Final chart consistency checks failed.");
  }
  const settings = {
    engine: `@swisseph/node ${manifest.packageVersion}`,
    bindingVersion: manifest.packageVersion,
    runtimeVersion: process.version,
    swissEphemerisLibraryVersion: "not-exposed-by-binding",
    ephemeris: "Swiss Ephemeris bundled package assets; data manifest v1",
    ephemerisManifestVersion: manifest.manifestVersion,
    npmTarballIntegrity: manifest.npmTarballIntegrity,
    ephemerisAssets: manifest.assets.map(({ filename, sha256 }) => ({ filename, sha256 })),
    ayanamsa: ayanamsaName,
    houseSystem: houseName,
    node: nodeMode,
    flags: siderealFlags,
    tropicalFlags: flags,
    ruleSetVersion: "life-core-0.2.0",
    timezoneDatabaseVersion: resolved.timezoneDatabaseVersion,
    timeScaleConvention: "IANA-resolved UTC instant; its Julian Day is supplied to Swiss calc_ut as a UT1 approximation without DUT1 correction. Swiss calc_ut applies Delta T internally for planetary positions; the binding does not expose the applied Delta T value.",
    coordinateConvention: "Swiss Ephemeris default geocentric apparent ecliptic coordinates; UTC-derived JD used as UT1 approximation without DUT1 correction; tropical and sidereal longitudes; configured ayanamsa applied by the engine",
  };
  const inputSnapshot = {
    localDate: input.localDate,
    localTime: input.localTime,
    timeZone: input.timeZone,
    resolvedOffset: resolved.resolvedOffset,
    utc: utc.toISOString(),
    julianDayUt: jdUt,
    julianDayUtc: jdUtc,
    julianDayUtInputScale: "UTC_APPROXIMATED_AS_UT1",
    latitude: input.latitude,
    longitude: input.longitude,
    coordinateSource: input.coordinateSource ?? "unspecified",
    fullName: input.fullName?.trim() || null,
    birthPlace: input.birthPlace?.trim() || null,
    birthTimeAccuracy: input.birthTimeAccuracy ?? "unspecified",
  };
  const sun = positionsWithHouses.find((planet) => planet.name === "Sun")!;
  const moon = positionsWithHouses.find((planet) => planet.name === "Moon")!;
  const divisionalCharts = Object.fromEntries(Array.from({ length: 59 }, (_, offset) => {
    const division = offset + 2;
    return [`D${division}`, [
      { name: "Lagna", ...calculateDivisionalLongitude(ascendant.longitude, division) },
      ...positionsWithHouses.map((planet) => ({ name: planet.name, ...calculateDivisionalLongitude(planet.siderealLongitude, division) })),
    ]];
  }));
  const vimshottariDasha = calculateVimshottariDasha(moon.siderealLongitude, utc);
  const panchanga = calculatePanchanga(sun.siderealLongitude, moon.siderealLongitude, input.localDate);

  // --- Astronomical events (Section F): rise/set, sunrise-based vara, transits and ingress ---
  const riseSetOptions = { localDate: input.localDate, timeZone: input.timeZone, latitude: input.latitude, longitude: input.longitude };
  const riseSet = calculateSunMoonRiseSet(riseSetOptions);
  const ishtakaal = calculateIshtakaal(input, riseSet.sunrise.utc);
  const vara = calculateVara(utc, riseSetOptions);
  const transits = calculateTransits(utc, { ayanamsa: ayanamsaName as AyanamsaName, horizonDays: 900 });

  // --- Yogas, doshas, dignity and Parashari aspects (Section E) using the chart's own ayanamsa ---
  const nodePlanet = positionsWithHouses.find((planet) => planet.name === (nodeMode === "mean" ? "Mean node" : "True node"))
    ?? positionsWithHouses.find((planet) => planet.name === "True node")
    ?? positionsWithHouses.find((planet) => planet.name === "Mean node");
  const yogaPlanets = [
    ...positionsWithHouses.filter((planet) => CLASSICAL_PLANETS.has(planet.name)).map((planet) => ({ name: planet.name, longitude: planet.siderealLongitude, speed: planet.longitudeSpeed })),
    ...(nodePlanet
      ? [{ name: "Rahu", longitude: nodePlanet.siderealLongitude, speed: nodePlanet.longitudeSpeed }, { name: "Ketu", longitude: wrap(nodePlanet.siderealLongitude + 180), speed: nodePlanet.longitudeSpeed }]
      : []),
  ];
  const planetaryDignity = calculatePlanetaryDignity(yogaPlanets);
  const planetaryAspects = calculateGrahaAspects(yogaPlanets, firstSignIndex);
  const yogasAndDoshas = calculateYogasAndDoshas({ ascendantLongitude: ascendant.longitude, planets: yogaPlanets });

  // --- KP astrology (Section D): its own Krishnamurti ayanamsa and Placidus cusps, independent of the selected ayanamsa/houses ---
  const computeKp = () => {
    setSiderealMode(SiderealMode.Krishnamurti);
    const kpAyanamsa = getAyanamsaExUt(jdUt, CalculationFlag.SwissEphemeris);
    const kpPlanets = [
      ["Sun", Planet.Sun], ["Moon", Planet.Moon], ["Mars", Planet.Mars], ["Mercury", Planet.Mercury],
      ["Jupiter", Planet.Jupiter], ["Venus", Planet.Venus], ["Saturn", Planet.Saturn], ["Rahu", LunarPoint.TrueNode],
    ].map(([name, body]) => {
      const sidereal = calculatePosition(jdUt, body as number, siderealFlags);
      if ((sidereal.flags & CalculationFlag.SwissEphemeris) === 0) throw new UnsupportedEphemerisDateError();
      return { name: name as string, longitude: sidereal.longitude };
    });
    const rahu = kpPlanets.find((planet) => planet.name === "Rahu")!;
    kpPlanets.push({ name: "Ketu", longitude: wrap(rahu.longitude + 180) });
    let kpCusps: number[];
    try {
      const kpHouses = calculateHouses(jdUt, input.latitude, input.longitude, HouseSystem.Placidus);
      kpCusps = kpHouses.cusps.slice(1, 13).map((cusp) => wrap(cusp - kpAyanamsa));
    } catch {
      throw new UnsupportedHouseCalculationError("Placidus (KP)");
    }
    if (kpCusps.length !== 12 || kpCusps.some((cusp) => !Number.isFinite(cusp))) throw new UnsupportedHouseCalculationError("Placidus (KP)");
    return { ...calculateKpAstrology({ planets: kpPlanets, cusps: kpCusps }), ayanamsaValue: Number(kpAyanamsa.toFixed(6)) };
  };
  // KP significators require Placidus cusps, which are undefined near the polar
  // circle. That must not fail a chart the user can otherwise calculate (for example
  // with Whole Sign houses), so KP is reported as unavailable rather than silently
  // substituting a different house system.
  let kp: ReturnType<typeof computeKp> | null = null;
  try {
    kp = computeKp();
  } catch (error) {
    if (!(error instanceof UnsupportedHouseCalculationError)) throw error;
  } finally {
    setSiderealMode(ayanamsaOptions[ayanamsaName]);
  }

  const resultCore = { input: inputSnapshot, settings, ayanamsa, ascendant, mc, houses, planets: positionsWithHouses, divisionalCharts, vimshottariDasha, panchanga, riseSet, ishtakaal, vara, transits, planetaryDignity, planetaryAspects, yogasAndDoshas, kp };
  const resultHash = createHash("sha256").update(JSON.stringify(resultCore)).digest("hex");
  return {
    ...resultCore,
    provenance: {
      resultHash,
      timezoneDatabaseVersion: resolved.timezoneDatabaseVersion,
      engineVersion: "@swisseph/node 1.4.0",
      calculatedAt: new Date().toISOString(),
      ruleSetVersion: settings.ruleSetVersion,
      calculationFlags: flags,
      status: "calculated",
      consistencyChecks: { tropicalSidereal: "passed", zodiacRanges: "passed", nakshatraPada: "derived-from-full-precision-sidereal-longitude", ascendantAndHouseCusps: "passed", houseAssignment: "passed" },
      independentReferenceValidation: "not-performed",
      fullyVerified: false,
      limitations: ["D2-D60 vargas and Vimshottari including Pratyantardasha use documented rule conventions but lack independent Vedic reference comparisons. Non-classical varga factors use an explicitly labeled Parivritti Cyclic custom mapping. The JPL fixtures compare tropical longitude/latitude for ten bodies at J2000 and Sun, Moon, and Mars at a second epoch, plus Mercury's retrograde rate at another epoch; they do not validate this complete chart.", "Yoga, dosha, dignity, aspect and KP results are rule-derived from documented conventions with boundary unit tests but no independent classical-text cross-check; the Moon's conditional (paksha-dependent) benefic status is not applied to Amala/Adhi. Rise/set inherits the UTC-as-UT1 approximation and the binding's default refraction, and reports no-event when the engine finds none. KP uses its own Krishnamurti ayanamsa and Placidus cusps independently of the selected chart ayanamsa/house system, and is reported as unavailable (null) when Placidus cusps are undefined near the polar circle.", "This individual chart has not been independently reference-validated."],
    },
  };
}

export function calculateBirthTimeSensitivity(input: BirthInput, windowMinutes: 2 | 5 | 15 = 5) {
  const resolved = resolveBirthInput(input);
  const flags = CalculationFlag.SwissEphemeris | CalculationFlag.Speed | CalculationFlag.Sidereal;
  const ayanamsaName = input.ayanamsa ?? "Lahiri";
  const ayanamsaOptions = { Lahiri: SiderealMode.Lahiri, Raman: SiderealMode.Raman, Krishnamurti: SiderealMode.Krishnamurti } as const;
  const houseName = input.houseSystem ?? "WholeSign";
  const houseOptions = { WholeSign: HouseSystem.WholeSign, Placidus: HouseSystem.Placidus, Koch: HouseSystem.Koch, Equal: HouseSystem.Equal } as const;
  const nodeMode = input.nodeMode ?? "both";
  const activeBodies = bodies.filter(([name]) => nodeMode === "both" || (nodeMode === "mean" ? name !== "True node" : name !== "Mean node"));
  setEphemerisPath(path.join(process.cwd(), "data", "ephemeris"));
  setSiderealMode(ayanamsaOptions[ayanamsaName]);
  const readings: { minute: number; placements: Record<string, string>; lagna: string; lagnaLongitude: number }[] = [];
  for (let minute = -windowMinutes; minute <= windowMinutes; minute++) {
    const instant = new Date(resolved.instant.getTime() + minute * 60_000);
    const jdUt = julianDay(instant.getUTCFullYear(), instant.getUTCMonth() + 1, instant.getUTCDate(), instant.getUTCHours() + instant.getUTCMinutes() / 60 + instant.getUTCSeconds() / 3600);
    const ayanamsa = getAyanamsaExUt(jdUt, CalculationFlag.SwissEphemeris);
    let houses;
    try { houses = calculateHouses(jdUt, input.latitude, input.longitude, houseOptions[houseName]); }
    catch { throw new UnsupportedHouseCalculationError(houseName); }
    const lagna = zodiac(houses.ascendant - ayanamsa);
    const firstSignIndex = Math.floor(lagna.longitude / 30);
    const cusps = houseName === "WholeSign"
      ? Array.from({ length: 12 }, (_, index) => ((firstSignIndex + index) * 30) % 360)
      : houses.cusps.slice(1, 13).map((cusp) => wrap(cusp - ayanamsa));
    if (cusps.length !== 12 || cusps.some((cusp) => !Number.isFinite(cusp))) throw new UnsupportedHouseCalculationError(houseName);
    const houseForLongitude = (longitude: number) => {
      const match = cusps.findIndex((cusp, index) => wrap(longitude - cusp) < wrap(cusps[(index + 1) % 12] - cusp));
      if (match < 0) throw new Error("House placement consistency check failed.");
      return match + 1;
    };
    const placements: Record<string, string> = { Lagna: lagna.sign };
    for (const [name, body] of activeBodies) {
      const position = calculatePosition(jdUt, body, flags);
      if ((position.flags & CalculationFlag.SwissEphemeris) === 0) throw new UnsupportedEphemerisDateError();
      const place = zodiac(position.longitude);
      const house = houseForLongitude(place.longitude);
      placements[name] = `${place.sign}|${place.nakshatra}|${place.pada}|${house}`;
    }
    readings.push({ minute, placements, lagna: lagna.sign, lagnaLongitude: lagna.longitude });
  }

  const labels = ["Lagna", ...activeBodies.map(([name]) => name)];
  const lagnaAnchor = readings.find((reading) => reading.minute === 0)!.lagnaLongitude;
  const lagnaUnwrapped = readings.map((reading) => lagnaAnchor + ((((reading.lagnaLongitude - lagnaAnchor) + 540) % 360) - 180));
  const changes = labels.map((label) => {
    const values = readings.map((reading) => reading.placements[label]);
    const outcomes = [...new Set(values)];
    const transitions = values.slice(1).flatMap((value, index) => value === values[index] ? [] : [{
      fromMinute: readings[index].minute,
      toMinute: readings[index + 1].minute,
      before: values[index],
      after: value,
    }]);
    return { label, stable: outcomes.length === 1, outcomes, transitions };
  });
  return {
    input: { utc: resolved.instant.toISOString(), timeZone: input.timeZone, resolvedOffset: resolved.resolvedOffset },
    settings: { windowMinutes, stepMinutes: 1, ayanamsa: ayanamsaName, houseSystem: houseName, nodeMode },
    sampleCount: readings.length,
    changes,
    lagnaRange: {
      minimumLongitude: wrap(Math.min(...lagnaUnwrapped)),
      maximumLongitude: wrap(Math.max(...lagnaUnwrapped)),
      spanDegrees: Math.max(...lagnaUnwrapped) - Math.min(...lagnaUnwrapped),
      signs: [...new Set(readings.map((reading) => reading.lagna))],
    },
    limitations: ["One-minute samples bracket transitions to a one-minute interval; transition instants are not root-refined.", `This check covers D1 sign/nakshatra/pada/${houseName} house classifications only; it does not recalculate Dasha or KP sub-lords and does not rectify birth time.`],
  };
}
