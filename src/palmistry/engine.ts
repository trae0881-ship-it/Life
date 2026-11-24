import {
  PALM_FEATURE_DEFINITIONS,
  PALM_FEATURE_IDS,
  type ObservationConfidence,
  type PalmFeatureId,
  type PalmTradition,
} from "./knowledge";

export const PALM_SIDES = ["left", "right"] as const;
export type PalmSide = typeof PALM_SIDES[number];
export type DominantHand = PalmSide | "unknown";
export type PalmLanguage = "en" | "hi";

export const HAND_SHAPES = ["earth", "air", "fire", "water"] as const;
export type HandShape = typeof HAND_SHAPES[number];

export const FINGER_LENGTHS = ["short", "average", "long"] as const;
export type FingerLength = typeof FINGER_LENGTHS[number];

export const THUMB_TYPES = ["flexible", "balanced", "firm"] as const;
export type ThumbType = typeof THUMB_TYPES[number];

export const LINE_NAMES = ["life", "head", "heart", "fate", "sun"] as const;
export type LineName = typeof LINE_NAMES[number];

export const LINE_QUALITIES = ["clear", "deep", "faint", "chained", "broken", "forked", "not-observed"] as const;
export type LineQuality = typeof LINE_QUALITIES[number];

export const MOUNT_NAMES = ["venus", "jupiter", "saturn", "apollo", "mercury", "moon", "mars"] as const;
export type MountName = typeof MOUNT_NAMES[number];

export const MOUNT_LEVELS = ["prominent", "balanced", "flat", "not-observed"] as const;
export type MountLevel = typeof MOUNT_LEVELS[number];

export type PalmObservations = {
  handShape: HandShape;
  fingerLength: FingerLength;
  thumb: ThumbType;
  lines: Record<LineName, LineQuality>;
  mounts: Record<MountName, MountLevel>;
  dominantHand?: DominantHand;
  observationConfidence?: ObservationConfidence;
  featureObservations?: Partial<Record<PalmFeatureId, import("./knowledge").PalmFeatureObservation>>;
};

export type PalmKnowledgeEntry = {
  id: string;
  category: "hand shape" | "finger" | "thumb" | "palm line" | "mount" | "major line" | "secondary line" | "marking";
  label: string;
  keywords: string[];
  content: string;
  contentHi?: string;
  location?: string;
  alternative?: string;
  alternativeHi?: string;
  sourceIds?: string[];
  traditions?: PalmTradition[];
};

export type PalmReportSection = {
  category: PalmKnowledgeEntry["category"];
  observation: string;
  interpretation: string;
  interpretationHi?: string;
  knowledgeId: string;
  sources?: string[];
  evidence?: Array<{ featureId: string; confidence: ObservationConfidence | null; weight: number }>;
};

export type PalmReport = {
  title: string;
  summary: string;
  sections: PalmReportSection[];
  disclaimer: string;
  language?: PalmLanguage;
  contradictions?: string[];
  dominantHand?: DominantHand;
  confidenceNotice?: string;
};

export type PalmQuestionAnswer = {
  answer: string;
  sources: PalmKnowledgeEntry[];
  disclaimer: string;
};

export type PalmComparison = {
  label: string;
  leftObservation: string;
  rightObservation: string;
}[];

const shapeLabels: Record<HandShape, string> = {
  earth: "Earth (broad palm, shorter fingers)",
  air: "Air (square palm, longer fingers)",
  fire: "Fire (longer palm, shorter fingers)",
  water: "Water (long palm, long fingers)",
};

const fingerLabels: Record<FingerLength, string> = {
  short: "Short fingers",
  average: "Average-length fingers",
  long: "Long fingers",
};

const thumbLabels: Record<ThumbType, string> = {
  flexible: "Flexible thumb",
  balanced: "Balanced thumb",
  firm: "Firm thumb",
};

const lineLabels: Record<LineName, string> = {
  life: "Life line",
  head: "Head line",
  heart: "Heart line",
  fate: "Fate line",
  sun: "Sun (Apollo) line",
};

const lineQualityLabels: Record<LineQuality, string> = {
  clear: "Clear",
  deep: "Deep",
  faint: "Faint",
  chained: "Chained",
  broken: "Broken",
  forked: "Forked",
  "not-observed": "Not observed",
};

const mountLabels: Record<MountName, string> = {
  venus: "Mount of Venus",
  jupiter: "Mount of Jupiter",
  saturn: "Mount of Saturn",
  apollo: "Mount of Apollo",
  mercury: "Mount of Mercury",
  moon: "Mount of Moon",
  mars: "Mount of Mars",
};

const mountLevelLabels: Record<MountLevel, string> = {
  prominent: "Prominent",
  balanced: "Balanced",
  flat: "Flat",
  "not-observed": "Not observed",
};

const LEGACY_PALM_KNOWLEDGE: PalmKnowledgeEntry[] = [
  { id: "shape.earth", category: "hand shape", label: "Earth hand", keywords: ["earth", "shape", "palm", "practical", "grounded"], content: "In traditional palmistry, an earth hand is associated symbolically with practicality, steadiness and a preference for tangible experience. This is a traditional association, not a measured personality trait." },
  { id: "shape.air", category: "hand shape", label: "Air hand", keywords: ["air", "shape", "palm", "curious", "communication"], content: "In traditional palmistry, an air hand is associated symbolically with curiosity, ideas and communication. This is a traditional association, not a measured personality trait." },
  { id: "shape.fire", category: "hand shape", label: "Fire hand", keywords: ["fire", "shape", "palm", "energy", "initiative"], content: "In traditional palmistry, a fire hand is associated symbolically with initiative, enthusiasm and action. This is a traditional association, not a measured personality trait." },
  { id: "shape.water", category: "hand shape", label: "Water hand", keywords: ["water", "shape", "palm", "sensitivity", "imagination"], content: "In traditional palmistry, a water hand is associated symbolically with sensitivity, imagination and reflection. This is a traditional association, not a measured personality trait." },
  { id: "finger.short", category: "finger", label: "Short fingers", keywords: ["finger", "short", "direct", "overview"], content: "Traditional palmistry associates relatively short fingers with a preference for an overview and direct action. Hand proportions vary naturally and do not determine ability or character." },
  { id: "finger.average", category: "finger", label: "Average-length fingers", keywords: ["finger", "average", "balanced", "proportion"], content: "Average-length fingers are recorded here as a neutral descriptive observation. Traditional interpretations vary by school; no fixed personality conclusion is warranted." },
  { id: "finger.long", category: "finger", label: "Long fingers", keywords: ["finger", "long", "detail", "careful"], content: "Traditional palmistry associates relatively long fingers with attention to detail and careful consideration. Hand proportions vary naturally and do not determine ability or character." },
  { id: "thumb.flexible", category: "thumb", label: "Flexible thumb", keywords: ["thumb", "flexible", "adaptable", "flexibility"], content: "A flexible thumb is traditionally associated with adaptability and openness. This is a symbolic palmistry association, not a psychological assessment." },
  { id: "thumb.balanced", category: "thumb", label: "Balanced thumb", keywords: ["thumb", "balanced", "moderation"], content: "A balanced thumb is recorded as a moderate observation. Palmistry schools use different thumb classifications, so this is not a definitive character assessment." },
  { id: "thumb.firm", category: "thumb", label: "Firm thumb", keywords: ["thumb", "firm", "determination", "steadiness"], content: "A firm thumb is traditionally associated with resolve and steadiness. This is a symbolic association, not a measured or predictive claim." },
  ...LINE_NAMES.flatMap((line) => LINE_QUALITIES.filter((quality) => quality !== "not-observed").map((quality) => ({
    id: `line.${line}.${quality}`,
    category: "palm line" as const,
    label: `${lineLabels[line]}: ${lineQualityLabels[quality]}`,
    keywords: [line, lineLabels[line].toLowerCase(), quality, "line", "palm"],
    content: lineInterpretation(line, quality),
  }))),
  ...MOUNT_NAMES.flatMap((mount) => MOUNT_LEVELS.filter((level) => level !== "not-observed").map((level) => ({
    id: `mount.${mount}.${level}`,
    category: "mount" as const,
    label: `${mountLabels[mount]}: ${mountLevelLabels[level]}`,
    keywords: [mount, mountLabels[mount].toLowerCase(), level, "mount", "palm"],
    content: mountInterpretation(mount, level),
  }))),
];

function traditionLabel(tradition: PalmTradition): string {
  if (tradition === "hasta-samudrika") return "Indian Samudrika";
  if (tradition === "cheiro") return "Cheiro";
  return "Western palmistry";
}

function featureContent(feature: (typeof PALM_FEATURE_DEFINITIONS)[number], language: PalmLanguage): string {
  if (feature.traditions.includes("hasta-samudrika")) {
    return language === "hi"
      ? `भारतीय समुद्रिका परंपरा में हस्तचिह्नों का वर्णन अपनी शब्दावली और संदर्भ में मिलता है। ${feature.label} को पश्चिमी नाम से स्वतः समान नहीं माना गया है।`
      : `Indian Samudrika sources describe hand signs within their own vocabulary and context. This ${feature.label.toLowerCase()} label is not automatically treated as an exact Western equivalent.`;
  }
  if (language === "hi") {
    return `पारंपरिक ${feature.traditions.map(traditionLabel).join(" / ")} व्याख्या में ${feature.label} को प्रतीकात्मक रूप से ${feature.themeHi} से जोड़ा जाता है। यह सांस्कृतिक मान्यता है, प्रमाणित व्यक्तित्व-माप या भविष्यवाणी नहीं।`;
  }
  return `Traditional ${feature.traditions.map(traditionLabel).join(" / ")} interpretations symbolically associate the ${feature.label.toLowerCase()} with ${feature.theme}. This is a cultural belief, not a validated personality measure or prediction.`;
}

export const PALM_KNOWLEDGE: PalmKnowledgeEntry[] = [
  ...PALM_FEATURE_DEFINITIONS.map((feature) => ({
    id: feature.id,
    category: feature.category,
    label: feature.label,
    keywords: [feature.id.replace(/[.-]/g, " "), feature.location, feature.theme, feature.themeHi, ...feature.variations],
    content: featureContent(feature, "en"),
    contentHi: featureContent(feature, "hi"),
    location: feature.location,
    alternative: feature.alternative,
    alternativeHi: feature.alternativeHi,
    sourceIds: feature.sourceIds,
    traditions: feature.traditions,
  })),
  ...LEGACY_PALM_KNOWLEDGE.filter((entry) => !PALM_FEATURE_IDS.includes(entry.id as PalmFeatureId)),
];

function lineInterpretation(line: LineName, quality: Exclude<LineQuality, "not-observed">): string {
  const topic: Record<LineName, string> = {
    life: "vitality and everyday change",
    head: "thinking and decision-making",
    heart: "emotional expression and relationships",
    fate: "direction and changing responsibilities",
    sun: "creative expression and recognition",
  };
  const form: Record<Exclude<LineQuality, "not-observed">, string> = {
    clear: "A clear line is traditionally read as a more readily expressed or consistent theme.",
    deep: "A deep line is traditionally read as an emphasized theme.",
    faint: "A faint line is traditionally read as a subtle or less emphasized theme.",
    chained: "A chained line is traditionally read as a theme with varied or shifting expression.",
    broken: "A broken line is traditionally read as a symbolic change or interruption in a theme; it does not predict an event.",
    forked: "A forked line is traditionally read as a theme with more than one direction or expression.",
  };
  return `${form[quality]} In this palmistry tradition, the ${lineLabels[line].toLowerCase()} relates symbolically to ${topic[line]}. It cannot establish health, lifespan, relationship outcomes or future events.`;
}

function mountInterpretation(mount: MountName, level: Exclude<MountLevel, "not-observed">): string {
  const themes: Record<MountName, string> = {
    venus: "affection and vitality",
    jupiter: "aspiration and leadership",
    saturn: "reflection and responsibility",
    apollo: "creativity and appreciation",
    mercury: "communication and exchange",
    moon: "imagination and travel",
    mars: "courage and resilience",
  };
  const reading = level === "prominent"
    ? "A prominent mount is traditionally read as an emphasized"
    : level === "flat"
      ? "A flat mount is traditionally read as a less emphasized"
      : "A balanced mount is traditionally read as a moderate";
  return `${reading} symbolic theme of ${themes[mount]}. This is a cultural palmistry association, not a measured trait or prediction.`;
}

export function labelPalmSide(side: PalmSide): string {
  return side === "left" ? "Left palm" : "Right palm";
}

export function labelPalmObservation(observations: PalmObservations, knowledgeId: string): string {
  if (knowledgeId.startsWith("shape.")) return shapeLabels[observations.handShape];
  if (knowledgeId.startsWith("finger.")) return fingerLabels[observations.fingerLength];
  if (knowledgeId.startsWith("thumb.")) return thumbLabels[observations.thumb];
  const entry = PALM_KNOWLEDGE.find((item) => item.id === knowledgeId);
  return entry?.label ?? "Observation";
}

export function generatePalmReport(observations: PalmObservations, side: PalmSide): PalmReport {
  const sections: PalmReportSection[] = [];
  const add = (knowledgeId: string) => {
    const entry = PALM_KNOWLEDGE.find((item) => item.id === knowledgeId);
    if (!entry) throw new Error(`Unknown palmistry rule: ${knowledgeId}`);
    sections.push({
      category: entry.category,
      observation: entry.label,
      interpretation: entry.content,
      knowledgeId: entry.id,
    });
  };

  add(`shape.${observations.handShape}`);
  add(`finger.${observations.fingerLength}`);
  add(`thumb.${observations.thumb}`);
  for (const line of LINE_NAMES) {
    const quality = observations.lines[line];
    if (quality !== "not-observed") {
      add(`line.${line}.${quality}`);
    } else {
      sections.push({
        category: "palm line",
        observation: `${lineLabels[line]}: Not observed`,
        interpretation: "No observation was selected for this line, so no traditional interpretation is generated.",
        knowledgeId: `line.${line}.not-observed`,
      });
    }
  }
  for (const mount of MOUNT_NAMES) {
    const level = observations.mounts[mount];
    if (level !== "not-observed") {
      add(`mount.${mount}.${level}`);
    } else {
      sections.push({
        category: "mount",
        observation: `${mountLabels[mount]}: Not observed`,
        interpretation: "No observation was selected for this mount, so no traditional interpretation is generated.",
        knowledgeId: `mount.${mount}.not-observed`,
      });
    }
  }

  return {
    title: `${labelPalmSide(side)} reading`,
    summary: `${sections.length} deterministic interpretation${sections.length === 1 ? "" : "s"} from your manually selected observations.`,
    sections,
    disclaimer: "For cultural and entertainment purposes only. Palmistry is not scientifically validated and this report does not predict events or provide medical, psychological, financial or other professional advice.",
  };
}

export function comparePalmObservations(left: PalmObservations, right: PalmObservations): PalmComparison {
  const differences: PalmComparison = [];
  const compare = (label: string, leftObservation: string, rightObservation: string) => {
    if (leftObservation !== rightObservation) differences.push({ label, leftObservation, rightObservation });
  };
  compare("Hand shape", shapeLabels[left.handShape], shapeLabels[right.handShape]);
  compare("Finger length", fingerLabels[left.fingerLength], fingerLabels[right.fingerLength]);
  compare("Thumb", thumbLabels[left.thumb], thumbLabels[right.thumb]);
  for (const line of LINE_NAMES) compare(lineLabels[line], lineQualityLabels[left.lines[line]], lineQualityLabels[right.lines[line]]);
  for (const mount of MOUNT_NAMES) compare(mountLabels[mount], mountLevelLabels[left.mounts[mount]], mountLevelLabels[right.mounts[mount]]);
  return differences;
}

export function searchPalmKnowledge(query: string, limit = 20): PalmKnowledgeEntry[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  if (!Number.isInteger(limit) || limit < 1) throw new Error("Search result limit must be a positive integer.");
  return PALM_KNOWLEDGE.filter((entry) => {
    const searchable = `${entry.label} ${entry.category} ${entry.keywords.join(" ")} ${entry.content}`.toLocaleLowerCase();
    return terms.every((term) => searchable.includes(term));
  }).slice(0, limit);
}

const questionStopWords = new Set([
  "a", "an", "and", "are", "about", "can", "does", "do", "explain", "for", "how", "i",
  "in", "is", "it", "me", "mean", "means", "my", "of", "please", "palmistry", "tell",
  "that", "the", "this", "to", "what", "when", "where", "which", "who", "why", "you",
]);

export function answerPalmQuestion(question: string): PalmQuestionAnswer | null {
  if (typeof question !== "string" || question.trim().length === 0 || question.length > 240) {
    throw new Error("Enter a question of 1 to 240 characters.");
  }
  const terms = [...new Set(
    question.toLocaleLowerCase().match(/[a-z0-9]+/g)?.filter((term) => term.length > 1 && !questionStopWords.has(term)) ?? [],
  )];
  if (terms.length === 0) return null;
  const matches = PALM_KNOWLEDGE.map((entry) => {
    const text = `${entry.label} ${entry.category} ${entry.keywords.join(" ")} ${entry.content}`.toLocaleLowerCase();
    const score = terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0);
    return { entry, score };
  }).filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label))
    .filter((result, index, results) => result.score === results[0].score)
    .slice(0, 3);
  if (matches.length === 0) return null;
  return {
    answer: matches.map(({ entry }) => entry.content).join("\n\n"),
    sources: matches.map(({ entry }) => entry),
    disclaimer: "This answer only retrieves bundled traditional palmistry reference text. It is not personalized advice or a scientific or predictive assessment.",
  };
}
