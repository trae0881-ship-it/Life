export const RASHI_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;

export type RashiPlanet = { name: string; sign: string; house: number; motion: string };

export function buildRashiLayout<T extends RashiPlanet>(planets: readonly T[], ascendantSign: string) {
  const ascendantIndex = RASHI_SIGNS.indexOf(ascendantSign as (typeof RASHI_SIGNS)[number]);
  if (ascendantIndex < 0) throw new Error(`Unsupported ascendant sign: ${ascendantSign}`);
  return RASHI_SIGNS.map((sign, signIndex) => ({
    sign,
    house: (signIndex - ascendantIndex + 12) % 12 + 1,
    isLagna: sign === ascendantSign,
    planets: planets.filter((planet) => planet.sign === sign),
  }));
}
