import { isValidDateOnly } from "../calculation/date-only.ts";

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableString(value: unknown): boolean {
  return value === null || isString(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isFiniteNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isFiniteNumber);
}

function isIsoInstant(value: unknown): value is string {
  return isString(value) && Number.isFinite(Date.parse(value));
}

function isPeriod(value: unknown): value is RecordValue {
  return isRecord(value)
    && isString(value.lord)
    && isIsoInstant(value.start)
    && isIsoInstant(value.end)
    && typeof value.runningAtBirth === "boolean";
}

function isAntardasha(value: unknown): boolean {
  return isPeriod(value)
    && Array.isArray(value.pratyantardashas)
    && value.pratyantardashas.every(isPeriod);
}

function isMahadasha(value: unknown): boolean {
  return isPeriod(value)
    && Array.isArray(value.antardashas)
    && value.antardashas.every(isAntardasha);
}

function isDasha(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.birthMoon) || !isString(value.birthMoon.nakshatra)
    || !isString(value.startingMahadasha) || !isFiniteNumber(value.remainingMahadashaBalanceYears)
    || !isRecord(value.convention) || !isFiniteNumber(value.convention.yearDays)
    || !Array.isArray(value.mahadashas)) return false;
  return value.mahadashas.every(isMahadasha);
}

function isZodiacPosition(value: unknown): boolean {
  return isRecord(value) && isString(value.sign)
    && ["degrees", "minutes", "seconds", "longitude"].every((key) => isFiniteNumber(value[key]));
}

function isPlanet(value: unknown): boolean {
  return isRecord(value)
    && isString(value.name) && isString(value.sign) && isString(value.nakshatra) && isString(value.motion)
    && ["longitude", "tropicalLongitude", "siderealLongitude", "degrees", "minutes", "seconds", "pada", "house", "latitude", "longitudeSpeed"]
      .every((key) => isFiniteNumber(value[key]));
}

function isTransitBody(value: unknown): boolean {
  if (!isRecord(value) || !isString(value.name) || !isString(value.sign)
    || !isString(value.nakshatra)
    || !["longitude", "signIndex", "pada"].every((key) => isFiniteNumber(value[key]))) return false;
  if (value.nextSignIngress === null) return true;
  const ingress = value.nextSignIngress;
  return isRecord(ingress) && isIsoInstant(ingress.utc) && isString(ingress.fromSign)
    && isString(ingress.toSign) && isString(ingress.direction) && isFiniteNumber(ingress.refinementDays);
}

function isRiseSetEvent(value: unknown): boolean {
  return isRecord(value) && isString(value.event) && isString(value.status)
    && isNullableString(value.utc) && isNullableString(value.localTime)
    && (value.julianDayUt === null || isFiniteNumber(value.julianDayUt))
    && isNullableString(value.eventLocalDate)
    && (value.occursOnReferenceDate === null || typeof value.occursOnReferenceDate === "boolean")
    && isNullableString(value.reason);
}

function isChartInput(value: unknown): boolean {
  if (!isRecord(value) || !isString(value.localDate) || !isValidDateOnly(value.localDate)) return false;
  const year = Number(value.localDate.slice(0, 4));
  return year >= 1800 && year <= 2399
    && isNullableString(value.fullName) && isNullableString(value.birthPlace)
    && isString(value.coordinateSource) && isString(value.birthTimeAccuracy)
    && isString(value.localTime) && isString(value.timeZone)
    && isString(value.resolvedOffset) && isIsoInstant(value.utc)
    && isFiniteNumber(value.julianDayUt) && isFiniteNumber(value.julianDayUtc)
    && isString(value.julianDayUtInputScale)
    && isFiniteNumber(value.latitude) && isFiniteNumber(value.longitude);
}

function isPanchanga(value: unknown): boolean {
  if (!isRecord(value) || !isString(value.weekday) || !isString(value.karana)
    || !isString(value.yoga) || !isString(value.convention)
    || !isRecord(value.nakshatra) || !isString(value.nakshatra.name)
    || !isFiniteNumber(value.nakshatra.index) || !isFiniteNumber(value.nakshatra.pada)
    || !isFiniteNumber(value.nakshatra.longitude)
    || !isRecord(value.tithi) || !isString(value.tithi.name)
    || !isFiniteNumber(value.tithi.number) || !isString(value.tithi.paksha)
    || !isFiniteNumber(value.tithi.elongationDegrees)) return false;
  return true;
}

function isDivisionalCharts(value: unknown): boolean {
  return isRecord(value) && Array.from({ length: 59 }, (_, index) => `D${index + 2}`).every((key) =>
    isDivisionalRows(value[key]));
}

function isDignity(value: unknown): boolean {
  return isRecord(value) && isString(value.name) && isString(value.sign)
    && isFiniteNumber(value.signIndex) && isFiniteNumber(value.degreesInSign)
    && isString(value.signLord) && isString(value.dignity)
    && (value.combust === null || typeof value.combust === "boolean")
    && (value.retrograde === null || typeof value.retrograde === "boolean");
}

function isAspects(value: unknown): boolean {
  return isRecord(value) && isString(value.convention) && Array.isArray(value.details)
    && value.details.every((detail) => isRecord(detail) && isString(detail.name)
      && isFiniteNumber(detail.house) && Array.isArray(detail.aspectsHouses)
      && detail.aspectsHouses.every(isFiniteNumber) && Array.isArray(detail.aspectsPlanets)
      && detail.aspectsPlanets.every(isString));
}

function isYoga(value: unknown): boolean {
  return isRecord(value) && isString(value.id) && isString(value.name)
    && (value.category === "yoga" || value.category === "dosha")
    && typeof value.present === "boolean" && isString(value.rule)
    && Array.isArray(value.planets) && value.planets.every(isString);
}

function isDivisionalRows(value: unknown): boolean {
  return Array.isArray(value) && value.every((placement) =>
    isRecord(placement) && isString(placement.name) && isString(placement.sign)
    && isString(placement.division) && isString(placement.convention)
    && isFiniteNumber(placement.longitude) && isFiniteNumber(placement.degreesInSign));
}

function isKpChain(value: unknown): boolean {
  const isSubdivision = (part: unknown) => isRecord(part) && isString(part.lord)
    && isFiniteNumber(part.index) && isFiniteNumber(part.startDegrees) && isFiniteNumber(part.spanDegrees);
  return isRecord(value) && isFiniteNumber(value.longitude) && isString(value.sign)
    && isFiniteNumber(value.signIndex) && isString(value.signLord)
    && isRecord(value.nakshatra) && isString(value.nakshatra.name)
    && isFiniteNumber(value.nakshatra.index) && isString(value.nakshatra.lord)
    && isFiniteNumber(value.nakshatra.pada) && isFiniteNumber(value.nakshatra.startDegrees)
    && isFiniteNumber(value.nakshatra.spanDegrees)
    && isSubdivision(value.sub) && isSubdivision(value.subSub);
}

function isKpPlanet(value: unknown): boolean {
  if (!isKpChain(value) || !isRecord(value) || !isString(value.name) || !isFiniteNumber(value.house)
    || !isRecord(value.significations)) return false;
  const significations = value.significations;
  return ["occupied", "owned", "starLordOccupied", "starLordOwned", "dispositorOccupied", "dispositorOwned", "houses"]
    .every((key) => isFiniteNumberArray(significations[key]));
}

function isKpCusp(value: unknown): boolean {
  return isKpChain(value) && isRecord(value) && isFiniteNumber(value.house)
    && Array.isArray(value.signifiedBy) && value.signifiedBy.every(isString);
}

function isKp(value: unknown): boolean {
  if (value === null) return true;
  return isRecord(value) && isString(value.system) && isString(value.ayanamsa)
    && isString(value.houseSystem) && isFiniteNumber(value.ayanamsaValue)
    && isRecord(value.convention) && Object.values(value.convention).every(isString)
    && Array.isArray(value.planets) && value.planets.every(isKpPlanet)
    && Array.isArray(value.cusps) && value.cusps.every(isKpCusp);
}

export function isRestorableSavedChartResult(value: unknown): value is RecordValue {
  if (!isRecord(value)) return false;
  const settings = value.settings;
  const riseSet = value.riseSet;
  if (!isChartInput(value.input) || !isRecord(settings)
    || !["engine", "ayanamsa", "houseSystem", "node", "ruleSetVersion"].every((key) => isString(settings[key]))
    || !isFiniteNumber(value.ayanamsa) || !isZodiacPosition(value.ascendant) || !isZodiacPosition(value.mc)
    || !Array.isArray(value.houses) || value.houses.length !== 12
    || !value.houses.every((house) => isRecord(house) && isFiniteNumber(house.house) && isString(house.sign) && isFiniteNumber(house.cuspLongitude))
    || !Array.isArray(value.planets) || value.planets.length < 7 || !value.planets.every(isPlanet)
    || !isDivisionalCharts(value.divisionalCharts) || !isDasha(value.vimshottariDasha)
    || !isPanchanga(value.panchanga)
    || !isRecord(riseSet) || !["sunrise", "sunset", "moonrise", "moonset"].every((key) => isRiseSetEvent(riseSet[key]))
    || !isRecord(value.vara) || !isString(value.vara.civilWeekday) || !isString(value.vara.status)
    || !isRecord(value.transits) || !isIsoInstant(value.transits.instantUtc)
    || !Array.isArray(value.transits.bodies) || !value.transits.bodies.every(isTransitBody)
    || !Array.isArray(value.planetaryDignity) || !value.planetaryDignity.every(isDignity)
    || !isAspects(value.planetaryAspects)
    || !Array.isArray(value.yogasAndDoshas) || !value.yogasAndDoshas.every(isYoga)
    || !isKp(value.kp)
    || !isRecord(value.provenance) || !isString(value.provenance.resultHash)
    || !isString(value.provenance.engineVersion) || value.provenance.status !== "calculated") return false;
  return true;
}
