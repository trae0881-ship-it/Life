import {
  palmistryHands,
  palmistryLines,
  palmistryMounts,
  type PalmistryHand,
  type PalmistryHandObservations,
  type PalmistryLine,
  type PalmistryLineObservation,
  type PalmistryMount,
  type PalmistryObservations,
} from "../server/palmistry-observations.ts";

export type InterpretationTone = "positive" | "neutral" | "challenging";
export type PalmistryEvidence = {
  hand: PalmistryHand;
  factor: string;
  observation: string;
  tone: InterpretationTone;
  interpretation: string;
  confidence: string;
  topics: PalmistryReportSectionId[];
};
export type PalmistryReportSectionId =
  | "overall"
  | "personality"
  | "thinking"
  | "emotions"
  | "love"
  | "marriage"
  | "career"
  | "business"
  | "finance"
  | "leadership"
  | "creativity"
  | "strengths"
  | "challenges"
  | "development"
  | "summary";

export type PalmistryReport = {
  method: "offline-manual-rules";
  traditionNote: string;
  safetyNote: string;
  dominantHand: PalmistryObservations["dominantHand"];
  dominantHandGuidance: string;
  hands: Record<PalmistryHand, { evidence: PalmistryEvidence[]; reviewedLines: number }>;
  comparison: { status: "available" | "insufficient"; details: string[] };
  sections: Array<{
    id: PalmistryReportSectionId;
    title: string;
    status: "traditional" | "insufficient";
    text: string;
    evidence: PalmistryEvidence[];
  }>;
};

type TraitDefinition = { tone: InterpretationTone; interpretation: string };
type KnowledgeEntry = {
  id: string;
  label: string;
  location: string;
  association: string;
  keywords: string[];
};

export const palmistryLineKnowledge: Record<PalmistryLine, KnowledgeEntry> = {
  lifeLine: {
    id: "lifeLine",
    label: "Life line",
    location: "Traditionally described as curving from the thumb-index area around the base of the thumb.",
    association: "A traditional reflection on vitality, habits, and one’s approach to change; it does not indicate lifespan or health.",
    keywords: ["vitality", "habit", "change", "life line"],
  },
  headLine: {
    id: "headLine",
    label: "Head line",
    location: "Traditionally described as crossing the palm from the thumb-index area.",
    association: "A traditional reflection on thinking and decision-making; it does not measure intelligence or predict results.",
    keywords: ["thinking", "decisions", "head line"],
  },
  heartLine: {
    id: "heartLine",
    label: "Heart line",
    location: "Traditionally described as running below the fingers across the upper palm.",
    association: "A traditional reflection on emotional expression and relating; it cannot establish another person’s feelings or a relationship outcome.",
    keywords: ["emotion", "relationships", "heart line"],
  },
  fateLine: {
    id: "fateLine",
    label: "Fate line",
    location: "Traditionally described as running upward through the center of the palm.",
    association: "A traditional reflection on work, roles, and direction; it does not guarantee a career or financial outcome.",
    keywords: ["work", "career", "direction", "fate line"],
  },
  sunLine: {
    id: "sunLine",
    label: "Sun / Apollo line",
    location: "Traditionally described as running toward the ring finger below the Apollo mount.",
    association: "A traditional reflection on creativity and recognition; it does not guarantee fame, wealth, or success.",
    keywords: ["creativity", "recognition", "sun line", "apollo line"],
  },
  mercuryLine: {
    id: "mercuryLine",
    label: "Mercury line",
    location: "Traditionally described as rising toward the little finger from the lower palm.",
    association: "A traditional reflection on communication and practical exchange, not a diagnosis or business forecast.",
    keywords: ["communication", "exchange", "mercury line"],
  },
  relationshipLines: {
    id: "relationshipLines",
    label: "Relationship / marriage lines",
    location: "Traditionally described as short horizontal marks on the outer edge below the little finger.",
    association: "Some traditions use these marks as prompts about attachment and partnership; they cannot establish marriage count or timing.",
    keywords: ["relationship", "marriage", "partnership", "relationship lines"],
  },
  travelLines: {
    id: "travelLines",
    label: "Travel lines",
    location: "Traditionally described as short marks on the outer lower palm near the Mount of Moon.",
    association: "A traditional reflection on curiosity and change, not a prediction that travel will occur.",
    keywords: ["travel", "change", "moon", "travel lines"],
  },
};

const lineFeatureKnowledge: Record<string, Record<string, TraitDefinition>> = {
  length: {
    short: { tone: "neutral", interpretation: "A shorter visible span is recorded as a visual feature, not as a measure of duration or ability." },
    medium: { tone: "neutral", interpretation: "A medium visible span is a description only; traditions vary in how they read it." },
    long: { tone: "positive", interpretation: "Some traditional readings associate a longer visible span with sustained emphasis on this line’s theme." },
  },
  shape: {
    straight: { tone: "neutral", interpretation: "A straighter appearance is traditionally read as a more direct expression of this theme." },
    curved: { tone: "positive", interpretation: "A curved appearance is traditionally read as a more flexible or expressive form of this theme." },
    wavy: { tone: "challenging", interpretation: "A wavy appearance is sometimes read as variation in this theme; it is not evidence of a future event." },
    chained: { tone: "challenging", interpretation: "A chained appearance is sometimes read as sensitivity or fluctuation in this theme, not as a factual condition." },
  },
  curvature: {
    slight: { tone: "neutral", interpretation: "The user-marked slight curve is a shape note; its meaning is interpretive and school-dependent." },
    moderate: { tone: "neutral", interpretation: "The user-marked moderate curve is a shape note; its meaning is interpretive and school-dependent." },
    strong: { tone: "positive", interpretation: "Some traditions associate a pronounced curve with expressiveness in this line’s theme." },
  },
  depth: {
    shallow: { tone: "challenging", interpretation: "A shallow appearance is sometimes interpreted as a less emphasized theme, not as an absence or deficit." },
    moderate: { tone: "neutral", interpretation: "A moderate appearance is recorded without assuming a particular outcome." },
    deep: { tone: "positive", interpretation: "Some traditions interpret a deeper appearance as emphasis on this line’s theme." },
  },
  continuity: {
    continuous: { tone: "positive", interpretation: "A continuous visible trace is traditionally associated with steadiness in this theme; it is not a guarantee." },
    interrupted: { tone: "challenging", interpretation: "An interruption is sometimes used as a prompt to reflect on transitions; it does not predict a disruption." },
  },
  breaks: {
    none: { tone: "positive", interpretation: "No break was marked in the visible area. This does not prove that the line is continuous outside the photographed area." },
    one: { tone: "neutral", interpretation: "One visible break was marked; palmistry traditions may read breaks as change, not a dated event." },
    multiple: { tone: "challenging", interpretation: "Multiple visible breaks were marked; interpretations vary and must not be treated as forecasts." },
  },
  branches: {
    none: { tone: "neutral", interpretation: "No branch was marked in the visible area." },
    upward: { tone: "positive", interpretation: "Some traditions read an upward branch as an aspirational emphasis on this line’s theme." },
    downward: { tone: "challenging", interpretation: "Some traditions read a downward branch as a point for reflection, not a negative prediction." },
    both: { tone: "neutral", interpretation: "Branches in both directions were marked; schools differ on their symbolic meaning." },
  },
  crossings: {
    none: { tone: "neutral", interpretation: "No crossing was marked in the visible area." },
    present: { tone: "neutral", interpretation: "A crossing was marked; its source and meaning cannot be determined from this selection alone." },
  },
};

export const palmistryHandShapeKnowledge: Record<string, KnowledgeEntry> = {
  earth: {
    id: "earth",
    label: "Earth hand",
    location: "A traditional category often described as a squarer palm with comparatively shorter fingers.",
    association: "Symbolically associated with practical, grounded approaches; this is a cultural archetype, not a personality test.",
    keywords: ["earth", "practical", "grounded", "square palm"],
  },
  air: {
    id: "air",
    label: "Air hand",
    location: "A traditional category often described as a squarer palm with comparatively longer fingers.",
    association: "Symbolically associated with curiosity and communication; this is not a measured ability.",
    keywords: ["air", "curiosity", "communication", "long fingers"],
  },
  fire: {
    id: "fire",
    label: "Fire hand",
    location: "A traditional category often described as a longer palm with comparatively shorter fingers.",
    association: "Symbolically associated with initiative and energy; it does not guarantee leadership or achievement.",
    keywords: ["fire", "initiative", "energy", "long palm"],
  },
  water: {
    id: "water",
    label: "Water hand",
    location: "A traditional category often described as a longer palm with comparatively longer fingers.",
    association: "Symbolically associated with sensitivity and imagination; it does not establish temperament.",
    keywords: ["water", "sensitivity", "imagination", "long fingers"],
  },
};

export const palmistryMountKnowledge: Record<PalmistryMount, KnowledgeEntry> = {
  venus: { id: "venus", label: "Mount of Venus", location: "The fleshy area at the base of the thumb.", association: "Traditionally associated with warmth, energy, and affection; not a measure of health or fertility.", keywords: ["venus", "warmth", "affection"] },
  jupiter: { id: "jupiter", label: "Mount of Jupiter", location: "Below the index finger.", association: "Traditionally associated with aspiration and guidance; not proof of leadership.", keywords: ["jupiter", "aspiration", "leadership"] },
  saturn: { id: "saturn", label: "Mount of Saturn", location: "Below the middle finger.", association: "Traditionally associated with reflection and responsibility; not a prediction of isolation or fate.", keywords: ["saturn", "reflection", "responsibility"] },
  apollo: { id: "apollo", label: "Mount of Apollo", location: "Below the ring finger.", association: "Traditionally associated with creative expression and appreciation; not a guarantee of recognition.", keywords: ["apollo", "creativity", "recognition"] },
  mercury: { id: "mercury", label: "Mount of Mercury", location: "Below the little finger.", association: "Traditionally associated with communication and exchange; not a diagnosis or business forecast.", keywords: ["mercury", "communication", "exchange"] },
  upperMars: { id: "upperMars", label: "Upper Mars", location: "The outer edge of the palm between the heart line and the Mount of Moon.", association: "Traditionally associated with composure under pressure; not a measure of aggression.", keywords: ["upper mars", "composure"] },
  lowerMars: { id: "lowerMars", label: "Lower Mars", location: "The area inside the thumb-side of the palm near the life line.", association: "Traditionally associated with initiative and persistence; not a measure of physical strength.", keywords: ["lower mars", "initiative", "persistence"] },
  plainOfMars: { id: "plainOfMars", label: "Plain of Mars", location: "The central area of the palm.", association: "Traditionally associated with balance and engagement; schools vary in their symbolism.", keywords: ["plain of mars", "balance"] },
  moon: { id: "moon", label: "Mount of Moon", location: "The lower outer edge of the palm.", association: "Traditionally associated with imagination and reflection; not a prediction of travel or mood.", keywords: ["moon", "imagination", "travel"] },
};

const shapeTraitDefinitions: Record<string, TraitDefinition> = {
  square: { tone: "neutral", interpretation: "A square palm proportion is recorded as a manual shape observation; traditional elemental categories differ." },
  long: { tone: "neutral", interpretation: "A longer palm proportion is recorded as a manual shape observation; it is not a personality measurement." },
  wide: { tone: "neutral", interpretation: "A wider palm proportion is recorded without inferring character or ability." },
  narrow: { tone: "neutral", interpretation: "A narrower palm proportion is recorded without inferring character or ability." },
  short: { tone: "neutral", interpretation: "A comparatively short proportion is a descriptive observation only." },
  balanced: { tone: "neutral", interpretation: "A balanced proportion is a descriptive observation only." },
  long_fingers: { tone: "neutral", interpretation: "Comparatively long fingers are a descriptive observation; symbolic readings are not scientific measurements." },
  close: { tone: "neutral", interpretation: "Closer spacing was manually selected; this does not establish a social trait." },
  wide_spacing: { tone: "neutral", interpretation: "Wider spacing was manually selected; this does not establish independence or behavior." },
  firm: { tone: "neutral", interpretation: "Firmness was entered manually and cannot be inferred from a still image." },
  moderate: { tone: "neutral", interpretation: "Moderate flexibility was entered manually and cannot be inferred from a still image." },
  flexible: { tone: "neutral", interpretation: "Flexibility was entered manually and cannot be inferred from a still image." },
  narrow_angle: { tone: "neutral", interpretation: "A narrower thumb angle was manually selected; traditions interpret this symbolically, not diagnostically." },
  balanced_angle: { tone: "neutral", interpretation: "A balanced thumb angle was manually selected; it is not a measure of will or ability." },
  wide_angle: { tone: "positive", interpretation: "Some traditions associate a wider thumb angle with openness; this is a symbolic association only." },
  flat: { tone: "challenging", interpretation: "A flatter mount is sometimes read as less emphasized in a traditional framework, not as a deficiency." },
  prominent: { tone: "positive", interpretation: "A prominent mount is sometimes read as an emphasized theme in a traditional framework, not as a guaranteed trait." },
  mount_balanced: { tone: "neutral", interpretation: "A balanced mount is recorded without predicting a result." },
};

const handShapeTopics: Record<string, PalmistryReportSectionId[]> = {
  handShape: ["overall", "personality", "thinking", "emotions", "strengths", "challenges", "development", "summary"],
  palmProportion: ["overall", "personality", "thinking", "strengths", "summary"],
  fingerProportion: ["overall", "personality", "thinking", "creativity", "summary"],
  fingerSpacing: ["overall", "personality", "love", "business", "summary"],
  fingerFlexibility: ["overall", "personality", "development", "summary"],
  thumb: ["overall", "personality", "business", "leadership", "strengths", "summary"],
  mounts: ["overall", "personality", "leadership", "creativity", "emotions", "career", "summary"],
};

const lineTopics: Record<PalmistryLine, PalmistryReportSectionId[]> = {
  lifeLine: ["overall", "personality", "strengths", "challenges", "development", "summary"],
  headLine: ["overall", "thinking", "career", "business", "leadership", "strengths", "challenges", "development", "summary"],
  heartLine: ["overall", "emotions", "love", "marriage", "personality", "strengths", "challenges", "development", "summary"],
  fateLine: ["overall", "career", "business", "finance", "leadership", "strengths", "challenges", "development", "summary"],
  sunLine: ["overall", "creativity", "finance", "personality", "strengths", "challenges", "development", "summary"],
  mercuryLine: ["overall", "business", "career", "love", "strengths", "challenges", "development", "summary"],
  relationshipLines: ["overall", "love", "marriage", "emotions", "summary"],
  travelLines: ["overall", "personality", "development", "summary"],
};

const sectionTitles: Record<PalmistryReportSectionId, string> = {
  overall: "Overall Palm Reading",
  personality: "Personality Interpretation",
  thinking: "Intelligence and Thinking Style",
  emotions: "Emotional Tendencies",
  love: "Love and Relationships",
  marriage: "Marriage and Partnership",
  career: "Career and Professional Life",
  business: "Business and Entrepreneurship",
  finance: "Financial Tendencies",
  leadership: "Leadership Qualities",
  creativity: "Creativity",
  strengths: "Strengths",
  challenges: "Challenges",
  development: "Personal Development",
  summary: "Overall Summary",
};

const sectionIds = Object.keys(sectionTitles) as PalmistryReportSectionId[];
const sectionDescriptions: Partial<Record<PalmistryReportSectionId, string>> = {
  overall: "A brief synthesis of the observations you selected.",
  thinking: "Traditional symbolism only; palm observations cannot measure intelligence, learning ability, or exam outcomes.",
  emotions: "Traditional symbolism only; these observations cannot establish another person’s feelings.",
  love: "Traditional symbolism only; no relationship outcome is predicted.",
  marriage: "Palmistry cannot determine marriage count, a partner’s identity, or an exact date.",
  career: "Traditional symbolism only; no occupation or career result is guaranteed.",
  business: "Traditional symbolism only; this is not financial or business advice.",
  finance: "Palmistry cannot guarantee wealth, income, or financial success.",
};

const noEvidenceText = "Insufficient manually verified observations for this topic. Add only details you can personally see or assess.";
const traditionalNote = "Palmistry is a cultural and traditional interpretive practice, not a scientifically validated prediction system.";
const safetyNote = "No palm line can reliably predict lifespan, death, medical conditions, exact marriage dates, or guaranteed financial success.";

function humanize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/-/g, " ").replace(/_/g, " ");
}

function lineObservationText(field: string, value: string): TraitDefinition | null {
  if (value === "not-reviewed" || value === "not-visible") return null;
  if (field === "visibility") {
    return value === "clear"
      ? { tone: "neutral", interpretation: "You marked this line clearly visible in the photo; this describes visibility only." }
      : { tone: "neutral", interpretation: "You marked this line faint; interpretations should be treated with extra caution." };
  }
  return lineFeatureKnowledge[field]?.[value] ?? null;
}

function lineEvidence(hand: PalmistryHand, line: PalmistryLine, observation: PalmistryLineObservation): PalmistryEvidence[] {
  if (observation.visibility !== "clear" && observation.visibility !== "faint") return [];
  const definition = palmistryLineKnowledge[line];
  const confidence = observation.confidence === "not-reviewed" ? "not-rated" : observation.confidence;
  const evidence: PalmistryEvidence[] = [{
    hand,
    factor: definition.label,
    observation: `${humanize(observation.visibility)}; ${definition.location}`,
    tone: "neutral",
    interpretation: definition.association,
    confidence,
    topics: lineTopics[line],
  }];
  for (const [field, value] of Object.entries(observation)) {
    if (field === "visibility" || field === "confidence" || typeof value !== "string") continue;
    const reading = lineObservationText(field, value);
    if (!reading) continue;
    evidence.push({
      hand,
      factor: `${definition.label} · ${humanize(field)}`,
      observation: humanize(value),
      tone: reading.tone,
      interpretation: reading.interpretation,
      confidence,
      topics: lineTopics[line],
    });
  }
  return evidence;
}

function handEvidence(hand: PalmistryHand, data: PalmistryHandObservations): PalmistryEvidence[] {
  const result: PalmistryEvidence[] = [];
  if (data.handShape !== "not-reviewed") {
    const definition = palmistryHandShapeKnowledge[data.handShape];
    result.push({
      hand,
      factor: definition.label,
      observation: definition.location,
      tone: "neutral",
      interpretation: definition.association,
      confidence: "manual-selection",
      topics: handShapeTopics.handShape,
    });
  }
  const traits: Array<[string, string, string]> = [
    ["palm proportion", "palmProportion", data.palmProportion],
    ["finger proportion", "fingerProportion", data.fingerProportion],
    ["finger spacing", "fingerSpacing", data.fingerSpacing],
    ["finger flexibility", "fingerFlexibility", data.fingerFlexibility],
    ["thumb angle", "thumbAngle", data.thumb.angle],
    ["thumb length", "thumbLength", data.thumb.length],
    ["thumb flexibility", "thumbFlexibility", data.thumb.flexibility],
  ];
  for (const [label, field, value] of traits) {
    if (value === "not-reviewed") continue;
    const lookup = field === "palmProportion" ? value
      : field === "fingerProportion" ? value === "long" ? "long_fingers" : value
        : field === "fingerSpacing" ? value === "wide" ? "wide_spacing" : value
          : field === "thumbAngle" ? `${value}_angle`
            : field === "thumbLength" ? value
              : value;
    const interpretation = shapeTraitDefinitions[lookup] ?? { tone: "neutral" as const, interpretation: "This manually entered characteristic is reported descriptively, without inferring a fixed trait." };
    result.push({
      hand,
      factor: label,
      observation: humanize(value),
      tone: interpretation.tone,
      interpretation: interpretation.interpretation,
      confidence: "manual-selection",
      topics: handShapeTopics[field] ?? ["overall", "summary"],
    });
  }
  for (const mount of palmistryMounts) {
    const state = data.mounts[mount];
    if (state === "not-reviewed") continue;
    const definition = palmistryMountKnowledge[mount];
    const lookup = state === "balanced" ? "mount_balanced" : state;
    const reading = shapeTraitDefinitions[lookup] ?? { tone: "neutral" as const, interpretation: "This is a user-selected traditional mount description, not a factual personality assessment." };
    result.push({
      hand,
      factor: definition.label,
      observation: `${humanize(state)} · ${definition.location}`,
      tone: reading.tone,
      interpretation: `${definition.association} ${reading.interpretation}`,
      confidence: "manual-selection",
      topics: handShapeTopics.mounts,
    });
  }
  for (const line of palmistryLines) result.push(...lineEvidence(hand, line, data.lines[line]));
  return result;
}

function lineReviewCount(data: PalmistryHandObservations) {
  return palmistryLines.filter((line) => data.lines[line].visibility !== "not-reviewed").length;
}

function evidenceForSection(id: PalmistryReportSectionId, hands: Record<PalmistryHand, PalmistryEvidence[]>) {
  return palmistryHands.flatMap((hand) => hands[hand].filter((item) => item.topics.includes(id)));
}

function compareHands(observations: PalmistryObservations) {
  const differences: string[] = [];
  const left = observations.hands.left;
  const right = observations.hands.right;
  const compare = (label: string, a: string, b: string) => {
    if (a === "not-reviewed" || b === "not-reviewed") return;
    if (a === b) differences.push(`${label}: both hands were marked ${humanize(a)}.`);
    else differences.push(`${label}: left was marked ${humanize(a)}; right was marked ${humanize(b)}.`);
  };
  compare("Hand shape", left.handShape, right.handShape);
  for (const line of palmistryLines) {
    compare(`${palmistryLineKnowledge[line].label} visibility`, left.lines[line].visibility, right.lines[line].visibility);
    compare(`${palmistryLineKnowledge[line].label} length`, left.lines[line].length, right.lines[line].length);
    compare(`${palmistryLineKnowledge[line].label} continuity`, left.lines[line].continuity, right.lines[line].continuity);
  }
  for (const mount of palmistryMounts) compare(`${palmistryMountKnowledge[mount].label}`, left.mounts[mount], right.mounts[mount]);
  return differences;
}

export function buildPalmistryReport(observations: PalmistryObservations): PalmistryReport {
  const handEvidenceBySide = {
    left: handEvidence("left", observations.hands.left),
    right: handEvidence("right", observations.hands.right),
  };
  const compare = compareHands(observations);
  const sections = sectionIds.map((id) => {
    const evidence = evidenceForSection(id, handEvidenceBySide);
    const detail = evidence.map((item) => `${item.hand} hand — ${item.factor}: ${item.interpretation}`).join(" ");
    const prefix = sectionDescriptions[id] ? `${sectionDescriptions[id]} ` : "";
    return {
      id,
      title: sectionTitles[id],
      status: evidence.length ? "traditional" as const : "insufficient" as const,
      text: evidence.length ? `${prefix}${detail}` : `${prefix}${noEvidenceText}`,
      evidence,
    };
  });
  const dominance = observations.dominantHand === null || observations.dominantHand === "unknown"
    ? "Dominant hand was not identified. This report keeps left and right observations separate."
    : observations.dominantHand === "ambidextrous"
      ? "You marked yourself ambidextrous. Palmistry schools vary on how to interpret this; both hands are shown separately."
      : `You marked the ${observations.dominantHand} hand as dominant. Some traditions read the dominant hand as practiced or current expression and the other as a different baseline; other schools use different conventions.`;
  return {
    method: "offline-manual-rules",
    traditionNote: traditionalNote,
    safetyNote,
    dominantHand: observations.dominantHand,
    dominantHandGuidance: dominance,
    hands: {
      left: { evidence: handEvidenceBySide.left, reviewedLines: lineReviewCount(observations.hands.left) },
      right: { evidence: handEvidenceBySide.right, reviewedLines: lineReviewCount(observations.hands.right) },
    },
    comparison: {
      status: compare.length ? "available" : "insufficient",
      details: compare.length ? compare : ["Both hands need manually reviewed details before a comparison can be made."],
    },
    sections,
  };
}

export function searchPalmistryKnowledge(query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  const entries = [
    ...palmistryLines.map((line) => palmistryLineKnowledge[line]),
    ...Object.values(palmistryHandShapeKnowledge),
    ...palmistryMounts.map((mount) => palmistryMountKnowledge[mount]),
  ];
  if (!normalized) return entries;
  return entries.filter((entry) => [entry.label, entry.location, entry.association, ...entry.keywords]
    .some((value) => value.toLocaleLowerCase().includes(normalized)));
}
