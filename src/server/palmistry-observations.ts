export const palmistryHands = ["left", "right"] as const;
export type PalmistryHand = (typeof palmistryHands)[number];
export const palmistryLines = [
  "lifeLine",
  "headLine",
  "heartLine",
  "fateLine",
  "sunLine",
  "mercuryLine",
  "relationshipLines",
  "travelLines",
] as const;
export type PalmistryLine = (typeof palmistryLines)[number];
export const palmistryFactors = palmistryLines;
export type PalmistryFactor = PalmistryLine;
export const palmistryVisibility = ["not-reviewed", "clear", "faint", "not-visible"] as const;
export type PalmistryVisibility = (typeof palmistryVisibility)[number];
export const palmistryLineLengths = ["not-reviewed", "short", "medium", "long"] as const;
export const palmistryLineShapes = ["not-reviewed", "straight", "curved", "wavy", "chained"] as const;
export const palmistryCurvatures = ["not-reviewed", "slight", "moderate", "strong"] as const;
export const palmistryDepths = ["not-reviewed", "shallow", "moderate", "deep"] as const;
export const palmistryContinuities = ["not-reviewed", "continuous", "interrupted"] as const;
export const palmistryBreaks = ["not-reviewed", "none", "one", "multiple"] as const;
export const palmistryBranches = ["not-reviewed", "none", "upward", "downward", "both"] as const;
export const palmistryCrossings = ["not-reviewed", "none", "present"] as const;
export const palmistryConfidence = ["not-reviewed", "low", "medium", "high"] as const;
export const palmistryHandShapes = ["not-reviewed", "earth", "air", "fire", "water"] as const;
export const palmistryPalmProportions = ["not-reviewed", "square", "long", "wide", "narrow"] as const;
export const palmistryFingerProportions = ["not-reviewed", "short", "balanced", "long"] as const;
export const palmistryFingerSpacing = ["not-reviewed", "close", "balanced", "wide"] as const;
export const palmistryFlexibility = ["not-reviewed", "firm", "moderate", "flexible"] as const;
export const palmistryThumbAngles = ["not-reviewed", "narrow", "balanced", "wide"] as const;
export const palmistryThumbLengths = ["not-reviewed", "short", "balanced", "long"] as const;
export const palmistryMounts = [
  "venus",
  "jupiter",
  "saturn",
  "apollo",
  "mercury",
  "upperMars",
  "lowerMars",
  "plainOfMars",
  "moon",
] as const;
export type PalmistryMount = (typeof palmistryMounts)[number];
export const palmistryMountStates = ["not-reviewed", "flat", "balanced", "prominent"] as const;
export type PalmistryDominantHand = "left" | "right" | "ambidextrous" | "unknown";

type Choice<T extends readonly string[]> = T[number];
export type PalmistryLineObservation = {
  visibility: PalmistryVisibility;
  length: Choice<typeof palmistryLineLengths>;
  shape: Choice<typeof palmistryLineShapes>;
  curvature: Choice<typeof palmistryCurvatures>;
  depth: Choice<typeof palmistryDepths>;
  continuity: Choice<typeof palmistryContinuities>;
  breaks: Choice<typeof palmistryBreaks>;
  branches: Choice<typeof palmistryBranches>;
  crossings: Choice<typeof palmistryCrossings>;
  confidence: Choice<typeof palmistryConfidence>;
};

export type PalmistryHandObservations = {
  handShape: Choice<typeof palmistryHandShapes>;
  palmProportion: Choice<typeof palmistryPalmProportions>;
  fingerProportion: Choice<typeof palmistryFingerProportions>;
  fingerSpacing: Choice<typeof palmistryFingerSpacing>;
  fingerFlexibility: Choice<typeof palmistryFlexibility>;
  thumb: {
    angle: Choice<typeof palmistryThumbAngles>;
    length: Choice<typeof palmistryThumbLengths>;
    flexibility: Choice<typeof palmistryFlexibility>;
  };
  mounts: Record<PalmistryMount, Choice<typeof palmistryMountStates>>;
  lines: Record<PalmistryLine, PalmistryLineObservation>;
};

export type LegacyPalmistryObservations = Record<
  "heartLine" | "headLine" | "lifeLine" | "fateLine" | "sunLine",
  PalmistryVisibility
>;

export type PalmistryObservations = {
  schemaVersion: 1;
  dominantHand: PalmistryDominantHand | null;
  hands: Record<PalmistryHand, PalmistryHandObservations>;
  legacyObservations: LegacyPalmistryObservations | null;
};

export const palmistryLegacyFactors = ["heartLine", "headLine", "lifeLine", "fateLine", "sunLine"] as const;

function emptyLineObservation(): PalmistryLineObservation {
  return {
    visibility: "not-reviewed",
    length: "not-reviewed",
    shape: "not-reviewed",
    curvature: "not-reviewed",
    depth: "not-reviewed",
    continuity: "not-reviewed",
    breaks: "not-reviewed",
    branches: "not-reviewed",
    crossings: "not-reviewed",
    confidence: "not-reviewed",
  };
}

export function emptyPalmistryHandObservations(): PalmistryHandObservations {
  return {
    handShape: "not-reviewed",
    palmProportion: "not-reviewed",
    fingerProportion: "not-reviewed",
    fingerSpacing: "not-reviewed",
    fingerFlexibility: "not-reviewed",
    thumb: { angle: "not-reviewed", length: "not-reviewed", flexibility: "not-reviewed" },
    mounts: Object.fromEntries(palmistryMounts.map((mount) => [mount, "not-reviewed"])) as Record<PalmistryMount, "not-reviewed">,
    lines: Object.fromEntries(palmistryLines.map((line) => [line, emptyLineObservation()])) as Record<PalmistryLine, PalmistryLineObservation>,
  };
}

export const emptyPalmistryObservations: PalmistryObservations = {
  schemaVersion: 1,
  dominantHand: null,
  hands: { left: emptyPalmistryHandObservations(), right: emptyPalmistryHandObservations() },
  legacyObservations: null,
};

function isOneOf<T extends readonly string[]>(value: unknown, choices: T): value is T[number] {
  return typeof value === "string" && choices.some((choice) => choice === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isLineObservation(value: unknown): value is PalmistryLineObservation {
  if (!isRecord(value)) return false;
  return hasKeys(value, ["visibility", "length", "shape", "curvature", "depth", "continuity", "breaks", "branches", "crossings", "confidence"])
    && isOneOf(value.visibility, palmistryVisibility)
    && isOneOf(value.length, palmistryLineLengths)
    && isOneOf(value.shape, palmistryLineShapes)
    && isOneOf(value.curvature, palmistryCurvatures)
    && isOneOf(value.depth, palmistryDepths)
    && isOneOf(value.continuity, palmistryContinuities)
    && isOneOf(value.breaks, palmistryBreaks)
    && isOneOf(value.branches, palmistryBranches)
    && isOneOf(value.crossings, palmistryCrossings)
    && isOneOf(value.confidence, palmistryConfidence);
}

function isPalmistryHandObservations(value: unknown): value is PalmistryHandObservations {
  if (!isRecord(value)) return false;
  const thumb = value.thumb;
  const mounts = value.mounts;
  const lines = value.lines;
  if (!isRecord(thumb) || !isRecord(mounts) || !isRecord(lines)) return false;
  if (!hasKeys(value, ["handShape", "palmProportion", "fingerProportion", "fingerSpacing", "fingerFlexibility", "thumb", "mounts", "lines"])) return false;
  if (!hasKeys(thumb, ["angle", "length", "flexibility"])
    || !isOneOf(thumb.angle, palmistryThumbAngles)
    || !isOneOf(thumb.length, palmistryThumbLengths)
    || !isOneOf(thumb.flexibility, palmistryFlexibility)) return false;
  return isOneOf(value.handShape, palmistryHandShapes)
    && isOneOf(value.palmProportion, palmistryPalmProportions)
    && isOneOf(value.fingerProportion, palmistryFingerProportions)
    && isOneOf(value.fingerSpacing, palmistryFingerSpacing)
    && isOneOf(value.fingerFlexibility, palmistryFlexibility)
    && hasKeys(mounts, palmistryMounts)
    && palmistryMounts.every((mount) => isOneOf(mounts[mount], palmistryMountStates))
    && hasKeys(lines, palmistryLines)
    && palmistryLines.every((line) => isLineObservation(lines[line]));
}

function isLegacyObservations(value: unknown): value is LegacyPalmistryObservations {
  if (!isRecord(value) || !hasKeys(value, palmistryLegacyFactors)) return false;
  return palmistryLegacyFactors.every((factor) => isOneOf(value[factor], palmistryVisibility));
}

function isPalmistryObservations(value: unknown): value is PalmistryObservations {
  if (!isRecord(value)) return false;
  const hands = value.hands;
  if (!isRecord(hands)) return false;
  return hasKeys(value, ["schemaVersion", "dominantHand", "hands", "legacyObservations"])
    && value.schemaVersion === 1
    && (value.dominantHand === null || isOneOf(value.dominantHand, ["left", "right", "ambidextrous", "unknown"] as const))
    && hasKeys(hands, palmistryHands)
    && palmistryHands.every((hand) => isPalmistryHandObservations(hands[hand]))
    && (value.legacyObservations === null || isLegacyObservations(value.legacyObservations));
}

export function parsePalmistryObservations(value: unknown): PalmistryObservations | null {
  if (isPalmistryObservations(value)) return value;
  if (!isRecord(value)) return null;
  if (Object.keys(value).length === 0) return emptyPalmistryObservations;
  if (!isLegacyObservations(value)) return null;
  return { ...emptyPalmistryObservations, legacyObservations: value };
}

export function readPalmistryObservationsInput(value: unknown) {
  return isPalmistryObservations(value) ? value : null;
}

export function assignLegacyObservations(
  observations: PalmistryObservations,
  hand: PalmistryHand,
): PalmistryObservations {
  if (!observations.legacyObservations) return observations;
  const lines = { ...observations.hands[hand].lines };
  for (const factor of palmistryLegacyFactors) {
    if (lines[factor].visibility === "not-reviewed" && observations.legacyObservations[factor] !== "not-reviewed") {
      lines[factor] = { ...lines[factor], visibility: observations.legacyObservations[factor] };
    }
  }
  return {
    ...observations,
    hands: { ...observations.hands, [hand]: { ...observations.hands[hand], lines } },
    legacyObservations: null,
  };
}

export function resetPalmistryHand(observations: PalmistryObservations, hand: PalmistryHand): PalmistryObservations {
  return { ...observations, hands: { ...observations.hands, [hand]: emptyPalmistryHandObservations() } };
}

export function hasPalmistryObservations(observations: PalmistryObservations) {
  if (observations.dominantHand) return true;
  if (observations.legacyObservations
    && palmistryLegacyFactors.some((factor) => observations.legacyObservations?.[factor] !== "not-reviewed")) return true;
  return palmistryHands.some((hand) => {
    const data = observations.hands[hand];
    if ([data.handShape, data.palmProportion, data.fingerProportion, data.fingerSpacing, data.fingerFlexibility,
      data.thumb.angle, data.thumb.length, data.thumb.flexibility, ...palmistryMounts.map((mount) => data.mounts[mount])]
      .some((value) => value !== "not-reviewed")) return true;
    return palmistryLines.some((line) => Object.values(data.lines[line]).some((value) => value !== "not-reviewed"));
  });
}
