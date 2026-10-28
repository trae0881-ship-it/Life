import { InputError, resolveBirthInput, type BirthInput } from "./time.ts";
import type { AyanamsaName } from "./events.ts";

const AYANAMSA_NAMES = ["Lahiri", "Raman", "Krishnamurti"] as const;

export function resolveTransitRequest(value: Record<string, unknown>) {
  if (typeof value.localDate !== "string" || typeof value.timeZone !== "string" ||
      typeof value.latitude !== "number" || typeof value.longitude !== "number" ||
      typeof value.ayanamsa !== "string" || !AYANAMSA_NAMES.includes(value.ayanamsa as AyanamsaName)) {
    throw new InputError("Transit date, IANA timezone, coordinates, and supported ayanamsa are required.", "INVALID_TRANSIT_INPUT");
  }
  const input: BirthInput = {
    localDate: value.localDate,
    localTime: "12:00",
    timeZone: value.timeZone,
    latitude: value.latitude,
    longitude: value.longitude,
  };
  return { instant: resolveBirthInput(input).instant, ayanamsa: value.ayanamsa as AyanamsaName };
}
