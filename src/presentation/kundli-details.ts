import { getJanmaPaya, getMoonSignVarna, getNakshatraClassification } from "../calculation/kundli-classifications.ts";

export type KundliDetailId =
  | "rashi"
  | "naam"
  | "lagna"
  | "dashaBalance"
  | "tithi"
  | "nakshatra"
  | "nakshatraPada"
  | "yoga"
  | "karana"
  | "ishtkaal"
  | "sunrise"
  | "rashiSwami"
  | "nakshatraSwami"
  | "nakshatraPaya"
  | "yoni"
  | "gana"
  | "nadi"
  | "varna";

export type KundliDetail = {
  id: KundliDetailId;
  value: string | null;
  secondary: string | null;
  source: "user" | "calculated" | "derived" | "unavailable";
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getKundliDetails(result: unknown): KundliDetail[] {
  const chart = record(result);
  const input = record(chart?.input);
  const ascendant = record(chart?.ascendant);
  const dasha = record(chart?.vimshottariDasha);
  const dashaConvention = record(dasha?.convention);
  const panchanga = record(chart?.panchanga);
  const tithi = record(panchanga?.tithi);
  const nakshatra = record(panchanga?.nakshatra);
  const riseSet = record(chart?.riseSet);
  const sunrise = record(riseSet?.sunrise);
  const ishtakaal = record(chart?.ishtakaal);
  const moon = Array.isArray(chart?.planets)
    ? chart.planets.map(record).find((planet) => planet?.name === "Moon") ?? null
    : null;
  const moonDignity = Array.isArray(chart?.planetaryDignity)
    ? chart.planetaryDignity.map(record).find((planet) => planet?.name === "Moon") ?? null
    : null;
  const name = stringValue(input?.fullName);
  const moonSign = stringValue(moon?.sign);
  const moonHouseFromLagna = finiteNumber(moon?.house);
  const nakshatraName = stringValue(nakshatra?.name);
  const nakshatraClassification = getNakshatraClassification(nakshatraName);
  const janmaPaya = getJanmaPaya(moonHouseFromLagna);
  const varna = getMoonSignVarna(moonSign);
  const dashaLord = stringValue(dasha?.startingMahadasha);
  const balanceYears = finiteNumber(dasha?.remainingMahadashaBalanceYears);
  const yearDays = finiteNumber(dashaConvention?.yearDays);
  const sunriseTime = sunrise && typeof sunrise === "object" && sunrise.status === "calculated" ? stringValue(sunrise.localTime) : null;
  const sunriseZone = stringValue(riseSet?.timeZone);
  const ishtakaalStatus = stringValue(ishtakaal?.status);
  const ishtakaalGhati = finiteNumber(ishtakaal?.ghati);
  const ishtakaalPala = finiteNumber(ishtakaal?.pala);
  const ishtakaalVipala = finiteNumber(ishtakaal?.vipala);

  return [
    { id: "rashi", value: moonSign, secondary: null, source: "calculated" },
    { id: "naam", value: name, secondary: null, source: "user" },
    { id: "lagna", value: stringValue(ascendant?.sign), secondary: null, source: "calculated" },
    {
      id: "dashaBalance",
      value: dashaLord,
      secondary: balanceYears === null ? null : `${balanceYears.toFixed(3)}|${yearDays ?? ""}`,
      source: "calculated",
    },
    {
      id: "tithi",
      value: [stringValue(tithi?.paksha), stringValue(tithi?.name)].filter(Boolean).join(" ") || null,
      secondary: null,
      source: "calculated",
    },
    { id: "nakshatra", value: nakshatraName, secondary: null, source: "calculated" },
    { id: "nakshatraPada", value: finiteNumber(nakshatra?.pada)?.toString() ?? null, secondary: null, source: "calculated" },
    { id: "yoga", value: stringValue(panchanga?.yoga), secondary: null, source: "calculated" },
    { id: "karana", value: stringValue(panchanga?.karana), secondary: null, source: "calculated" },
    {
      id: "ishtkaal",
      value: ishtakaalStatus === "calculated" && ishtakaalGhati !== null ? `${ishtakaalGhati.toFixed(2)} ghati` : null,
      secondary: ishtakaalStatus === "calculated" && ishtakaalPala !== null && ishtakaalVipala !== null ? `${ishtakaalPala.toFixed(0)} pala / ${ishtakaalVipala.toFixed(0)} vipala` : null,
      source: ishtakaalStatus === "calculated" ? "calculated" : "unavailable",
    },
    {
      id: "sunrise",
      value: sunriseTime,
      secondary: sunriseTime && sunriseZone ? sunriseZone : null,
      source: sunriseTime ? "calculated" : "unavailable",
    },
    { id: "rashiSwami", value: moonSign ? stringValue(moonDignity?.signLord) : null, secondary: null, source: "derived" },
    { id: "nakshatraSwami", value: stringValue(dashaLord), secondary: null, source: "derived" },
    { id: "nakshatraPaya", value: janmaPaya ? `${janmaPaya[0].toUpperCase()}${janmaPaya.slice(1)}` : null, secondary: janmaPaya ? "Moon house from Lagna" : null, source: janmaPaya ? "derived" : "unavailable" },
    { id: "yoni", value: nakshatraClassification?.yoni ?? null, secondary: null, source: nakshatraClassification ? "derived" : "unavailable" },
    { id: "gana", value: nakshatraClassification?.gana ?? null, secondary: null, source: nakshatraClassification ? "derived" : "unavailable" },
    { id: "nadi", value: nakshatraClassification?.nadi ?? null, secondary: null, source: nakshatraClassification ? "derived" : "unavailable" },
    { id: "varna", value: varna, secondary: null, source: varna ? "derived" : "unavailable" },
  ];
}
