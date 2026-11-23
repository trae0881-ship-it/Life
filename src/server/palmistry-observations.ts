export const palmistryFactors = ["heartLine", "headLine", "lifeLine", "fateLine", "sunLine"] as const;
export type PalmistryFactor = (typeof palmistryFactors)[number];
export const palmistryVisibility = ["not-reviewed", "clear", "faint", "not-visible"] as const;
export type PalmistryVisibility = (typeof palmistryVisibility)[number];
export type PalmistryObservations = Record<PalmistryFactor, PalmistryVisibility>;

export const emptyPalmistryObservations: PalmistryObservations = {
  heartLine: "not-reviewed",
  headLine: "not-reviewed",
  lifeLine: "not-reviewed",
  fateLine: "not-reviewed",
  sunLine: "not-reviewed",
};

function isPalmistryObservations(value: unknown): value is PalmistryObservations {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== palmistryFactors.length
    || !palmistryFactors.every((factor) => palmistryVisibility.some((visibility) => visibility === record[factor]))) return false;
  return true;
}

export function parsePalmistryObservations(value: unknown): PalmistryObservations | null {
  return isPalmistryObservations(value) ? value : null;
}

export function readPalmistryObservationsInput(value: unknown) {
  return parsePalmistryObservations(value);
}
