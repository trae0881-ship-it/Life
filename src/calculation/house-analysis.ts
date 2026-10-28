export type HouseCuspInput = { house: number; sign: string; cuspLongitude: number };
export type HousePlanetInput = { name: string; sign: string; longitude: number; house: number };
export type AspectInput = {
  convention: string;
  details: { name: string; house: number; aspectsHouses: number[]; aspectsPlanets: string[] }[];
};
export type AspectPlanetInput = { name: string; sign: string };

export type HouseAnalysis = {
  convention: string;
  houses: {
    house: number;
    sign: string;
    cuspLongitude: number;
    nextCuspLongitude: number;
    intervalMidpointLongitude: number;
    planets: string[];
  }[];
};

const wrap = (longitude: number) => ((longitude % 360) + 360) % 360;
const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

export function signHouseFromReference(sign: string, referenceSign: string): number | null {
  const signIndex = signs.indexOf(sign);
  const referenceIndex = signs.indexOf(referenceSign);
  return signIndex < 0 || referenceIndex < 0 ? null : ((signIndex - referenceIndex + 12) % 12) + 1;
}

export function findHouseForLongitude(cusps: number[], longitude: number): number | null {
  if (cusps.length !== 12 || !Number.isFinite(longitude) || cusps.some((cusp) => !Number.isFinite(cusp))) return null;
  const position = wrap(longitude);
  const house = cusps.findIndex((cusp, index) => {
    const start = wrap(cusp);
    const end = wrap(cusps[(index + 1) % cusps.length]);
    const distance = wrap(position - start);
    const span = wrap(end - start);
    return distance < span || (span === 0 && distance === 0);
  });
  return house < 0 ? null : house + 1;
}

export function buildHouseAnalysis(
  houses: HouseCuspInput[],
  planets: HousePlanetInput[],
  houseSystem: string,
): HouseAnalysis | null {
  if (
    houses.length !== 12
    || houses.some((house, index) => house.house !== index + 1 || !Number.isFinite(house.cuspLongitude) || !house.sign)
    || planets.some((planet) => !Number.isInteger(planet.house) || planet.house < 1 || planet.house > 12 || !Number.isFinite(planet.longitude))
  ) return null;

  return {
    convention: houseSystem,
    houses: houses.map((house, index) => {
      const cuspLongitude = wrap(house.cuspLongitude);
      const nextCuspLongitude = wrap(houses[(index + 1) % houses.length].cuspLongitude);
      const forwardSpan = wrap(nextCuspLongitude - cuspLongitude);
      return {
        house: house.house,
        sign: house.sign,
        cuspLongitude,
        nextCuspLongitude,
        intervalMidpointLongitude: wrap(cuspLongitude + forwardSpan / 2),
        planets: planets.filter((planet) => planet.house === house.house).map((planet) => planet.name),
      };
    }),
  };
}

export function planetsFromMoon<T extends HousePlanetInput>(planets: T[], moonSign: string | null | undefined): (T & { house: number })[] | null {
  const moonSignIndex = signs.indexOf(moonSign ?? "");
  if (moonSignIndex < 0 || !planets.length || planets.some((planet) => !signs.includes(planet.sign))) return null;
  return planets.map((planet) => ({
    ...planet,
    house: ((signs.indexOf(planet.sign) - moonSignIndex + 12) % 12) + 1,
  }));
}

export function listParashariAspects(aspects: AspectInput | null | undefined, planets: AspectPlanetInput[] = [], ascendantSign?: string) {
  if (!aspects || !Array.isArray(aspects.details)) return null;
  if (aspects.details.some((detail) => !Number.isInteger(detail.house) || detail.house < 1 || detail.house > 12 || detail.aspectsHouses.some((house) => !Number.isInteger(house) || house < 1 || house > 12))) return null;
  const ascendantIndex = signs.indexOf(ascendantSign ?? "");
  if (planets.length && (ascendantIndex < 0 || planets.some((planet) => !signs.includes(planet.sign)))) return null;
  return aspects.details.flatMap((detail) => detail.aspectsHouses.map((targetHouse) => {
    const offset = ((targetHouse - detail.house + 12) % 12) + 1;
    const aspectName = (name: string) => name === "Mean node" || name === "True node" ? "Rahu" : name === "Mean Ketu" || name === "True Ketu" ? "Ketu" : name;
    const targetPlanets = planets.length
      ? planets.filter((planet) => ((signs.indexOf(planet.sign) - ascendantIndex + 12) % 12) + 1 === targetHouse && detail.aspectsPlanets.includes(aspectName(planet.name))).map((planet) => planet.name)
      : [];
    return {
      planet: detail.name,
      sourceHouse: detail.house,
      targetHouse,
      targetPlanets,
      aspectOffset: offset,
    };
  }));
}
