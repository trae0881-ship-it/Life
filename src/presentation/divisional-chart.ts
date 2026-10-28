export type DivisionalRow = {
  name: string;
  division: string;
  convention: string;
  segment: number;
  sign: string;
  longitude: number;
  degreesInSign: number;
  house?: number;
};

export type DivisionalChartData = {
  ascendant: { sign: string; longitude: number };
  houses: { house: number; sign: string; cuspLongitude: number }[];
  planets: { name: string; sign: string; house: number; longitude: number; motion: string }[];
  divisionalCharts: Record<string, DivisionalRow[]>;
};

export function rowsForDivision(chart: DivisionalChartData, division: number): DivisionalRow[] {
  if (division > 1) return chart.divisionalCharts[`D${division}`] ?? [];
  return [
    {
      name: "Lagna",
      division: "D1",
      convention: "D1 Rashi: selected chart ascendant and house system",
      segment: 1,
      sign: chart.ascendant.sign,
      longitude: chart.ascendant.longitude,
      degreesInSign: chart.ascendant.longitude % 30,
      house: 1,
    },
    ...chart.planets.map((planet) => ({
      name: planet.name,
      division: "D1",
      convention: "D1 Rashi: selected chart ascendant and house system",
      segment: 1,
      sign: planet.sign,
      longitude: planet.longitude,
      degreesInSign: planet.longitude % 30,
      house: planet.house,
    })),
  ];
}
