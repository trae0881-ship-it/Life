import { calculatePlanetaryDignity, type YogaPlanet } from "./yogas.ts";

export type PlanetaryStatusInput = {
  name: string;
  longitude?: number;
  longitudeSpeed?: number;
  motion?: string;
  sign?: string;
  degreesInSign?: number;
};

export type PlanetaryStatus = {
  name: string;
  natalSign: string | null;
  natalDegrees: number | null;
  divisionalSign: string | null;
  divisionalDegrees: number | null;
  dignity: string | null;
  combust: boolean | null;
  retrograde: boolean | null;
  vargottama: boolean | null;
  available: boolean;
  limitation: string | null;
};

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function signFromLongitude(longitude: number) {
  return ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"][Math.floor((((longitude % 360) + 360) % 360) / 30)];
}

function degreesInSign(longitude: number) {
  return ((longitude % 30) + 30) % 30;
}

export function analyzePlanetaryStatuses(
  natalPlanets: PlanetaryStatusInput[],
  divisionalPlanets: PlanetaryStatusInput[] = natalPlanets,
): PlanetaryStatus[] {
  if (!natalPlanets.length) return [];
  const dignityInput: YogaPlanet[] = natalPlanets
    .filter((planet) => finite(planet.longitude))
    .map((planet) => ({ name: planet.name, longitude: planet.longitude as number, speed: planet.longitudeSpeed }));
  const dignity = dignityInput.length ? calculatePlanetaryDignity(dignityInput) : [];
  const dignityByName = new Map(dignity.map((item) => [item.name, item]));
  const divisionalByName = new Map(divisionalPlanets.map((planet) => [planet.name, planet]));

  return natalPlanets.map((planet) => {
    const natalLongitude = finite(planet.longitude) ? planet.longitude : null;
    const divisional = divisionalByName.get(planet.name);
    const divisionalLongitude = divisional && finite(divisional.longitude) ? divisional.longitude : null;
    const calculated = dignityByName.get(planet.name);
    const natalSign = natalLongitude === null ? null : (planet.sign ?? signFromLongitude(natalLongitude));
    const divisionalSign = divisionalLongitude === null ? null : (divisional?.sign ?? signFromLongitude(divisionalLongitude));
    return {
      name: planet.name,
      natalSign,
      natalDegrees: natalLongitude === null ? null : (planet.degreesInSign ?? degreesInSign(natalLongitude)),
      divisionalSign,
      divisionalDegrees: divisionalLongitude === null ? null : (divisional?.degreesInSign ?? degreesInSign(divisionalLongitude)),
      dignity: calculated?.dignity ?? null,
      combust: calculated?.combust ?? null,
      retrograde: calculated?.retrograde ?? (typeof planet.motion === "string" ? planet.motion.toLowerCase() === "retrograde" : null),
      vargottama: natalSign !== null && divisionalSign !== null ? natalSign === divisionalSign : null,
      available: natalLongitude !== null && divisionalLongitude !== null,
      limitation: calculated && divisionalSign !== null ? null : "Required natal or divisional longitude is unavailable.",
    };
  });
}
