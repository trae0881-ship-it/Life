import {
  PALM_FEATURE_DEFINITIONS,
  PALM_FEATURE_IDS,
  PALM_SOURCES_BY_TRADITION,
  type ObservationConfidence,
  type PalmFeatureId,
  type PalmTradition,
} from "./knowledge.ts";
import { PALM_SOURCES, PALM_TRADITION_DIFFERENCES } from "./sources.ts";

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
  labelHi?: string;
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
  futureOriented?: boolean;
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
const lineLabelsHi: Record<LineName, string> = {
  life: "जीवन रेखा",
  head: "मस्तिष्क रेखा",
  heart: "हृदय रेखा",
  fate: "भाग्य रेखा",
  sun: "सूर्य रेखा",
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
const mountLabelsHi: Record<MountName, string> = {
  venus: "शुक्र पर्वत",
  jupiter: "बृहस्पति पर्वत",
  saturn: "शनि पर्वत",
  apollo: "अपोलो पर्वत",
  mercury: "बुध पर्वत",
  moon: "चंद्र पर्वत",
  mars: "मंगल पर्वत",
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
  const statements = feature.traditions.map((tradition) => tradition === "hasta-samudrika"
    ? language === "hi"
      ? `भारतीय समुद्रिका परंपरा में हस्तचिह्नों का वर्णन अपनी शब्दावली और संदर्भ में मिलता है; ${feature.labelHi} को पश्चिमी नामों से स्वतः समान नहीं माना गया है।`
      : "Indian Samudrika sources describe hand signs within their own vocabulary and context; they are not automatically equated with Western labels."
    : language === "hi"
      ? `पारंपरिक ${traditionLabel(tradition)} व्याख्या में ${feature.labelHi} को प्रतीकात्मक रूप से ${feature.themeHi} से जोड़ा जाता है।`
      : `Traditional ${traditionLabel(tradition)} interpretations symbolically associate the ${feature.label.toLowerCase()} with ${feature.theme}.`);
  return `${[...new Set(statements)].join(" ")} ${language === "hi"
    ? "यह सांस्कृतिक मान्यता है, प्रमाणित व्यक्तित्व-माप या भविष्यवाणी नहीं।"
    : "These are cultural beliefs, not validated personality measures or predictions."}`;
}

export const PALM_KNOWLEDGE: PalmKnowledgeEntry[] = [
  ...PALM_FEATURE_DEFINITIONS.map((feature) => ({
    id: feature.id,
    category: feature.category,
    label: feature.label,
    labelHi: feature.labelHi,
    keywords: [feature.id.replace(/[.-]/g, " "), feature.labelHi, feature.location, feature.theme, feature.themeHi, ...feature.variations],
    content: featureContent(feature, "en"),
    contentHi: featureContent(feature, "hi"),
    location: feature.location,
    alternative: feature.alternative,
    alternativeHi: feature.alternativeHi,
    sourceIds: feature.sourceIds,
    traditions: feature.traditions,
  })),
  ...LEGACY_PALM_KNOWLEDGE
    .filter((entry) => !PALM_FEATURE_IDS.includes(entry.id as PalmFeatureId))
    .map((entry) => {
      const line = entry.id.match(/^line\.([a-z]+)\.([a-z-]+)$/);
      const mount = entry.id.match(/^mount\.([a-z-]+)\.([a-z-]+)$/);
      const lineQualityHi: Record<string, string> = {
        clear: "स्पष्ट", deep: "गहरी", faint: "हल्की", chained: "श्रृंखलाबद्ध", broken: "टूटी", forked: "शाखित",
      };
      const lineHi = line
        ? `पारंपरिक व्याख्या में ${lineQualityHi[line[2]] ?? ""} ${lineLabelsHi[line[1] as LineName] ?? "रेखा"} को प्रतीकात्मक विषय से जोड़ा जाता है; इससे भविष्य की घटना तय नहीं होती।`
        : undefined;
      const mountHi = mount
        ? `पारंपरिक व्याख्या में ${mountLabelsHi[mount[1] as MountName] ?? "यह पर्वत"} का ${mount[2] === "prominent" ? "उभरा" : mount[2] === "flat" ? "समतल" : "संतुलित"} होना एक सांस्कृतिक प्रतीक है, प्रमाणित व्यक्तित्व-माप नहीं।`
        : undefined;
      const simpleHi: Record<string, string> = {
        "finger.short": "छोटी उँगलियों को कुछ पारंपरिक पद्धतियाँ समग्र दृष्टि और सीधे काम से जोड़ती हैं; अनुपात क्षमता तय नहीं करते।",
        "finger.average": "औसत लंबाई को यहाँ तटस्थ वर्णन के रूप में दर्ज किया गया है; इसकी व्याख्या पद्धति अनुसार बदलती है।",
        "finger.long": "लंबी उँगलियों को कुछ पारंपरिक पद्धतियाँ विस्तार पर ध्यान से जोड़ती हैं; अनुपात क्षमता तय नहीं करते।",
        "thumb.flexible": "लचीले अंगूठे को कुछ पारंपरिक पद्धतियाँ अनुकूलनशीलता से प्रतीकात्मक रूप से जोड़ती हैं।",
        "thumb.balanced": "संतुलित अंगूठा एक वर्णनात्मक अवलोकन है; अलग पद्धतियों में इसकी व्याख्या भिन्न है।",
        "thumb.firm": "दृढ़ अंगूठे को कुछ पारंपरिक पद्धतियाँ संकल्प से प्रतीकात्मक रूप से जोड़ती हैं।",
      };
      const simpleLabelsHi: Record<string, string> = {
        "finger.short": "छोटी उँगलियाँ",
        "finger.average": "औसत लंबाई की उँगलियाँ",
        "finger.long": "लंबी उँगलियाँ",
        "thumb.flexible": "लचीला अंगूठा",
        "thumb.balanced": "संतुलित अंगूठा",
        "thumb.firm": "दृढ़ अंगूठा",
      };
      return {
        ...entry,
        labelHi: line ? `${lineLabelsHi[line[1] as LineName] ?? "रेखा"}: ${lineQualityHi[line[2]] ?? line[2]}` : mount ? `${mountLabelsHi[mount[1] as MountName] ?? "पर्वत"}: ${mount[2]}` : simpleLabelsHi[entry.id],
        contentHi: simpleHi[entry.id] ?? lineHi ?? mountHi ?? entry.content,
        sourceIds: knowledgeSourceIds(entry),
        traditions: ["western", "cheiro"] as PalmTradition[],
      };
    }),
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

export type PalmInterpretationRule = {
  id: string;
  featureId: PalmFeatureId;
  tradition: PalmTradition;
  weight: number;
  rationale: string;
  sourceIds: string[];
};

export const PALM_RULES: PalmInterpretationRule[] = PALM_FEATURE_DEFINITIONS.flatMap((feature) =>
  feature.traditions.map((tradition) => ({
    id: `${feature.id}.${tradition}`,
    featureId: feature.id,
    tradition,
    weight: 0.6,
    rationale: "One manually observed symbolic association. The weight orders evidence; it is not a probability or validated accuracy score.",
    sourceIds: PALM_SOURCES_BY_TRADITION[tradition],
  })),
);

const confidenceWeights: Record<ObservationConfidence, number> = { low: 0.35, medium: 0.65, high: 0.85 };
export const PALM_CONFIDENCE_WEIGHTS = confidenceWeights;

function knowledgeSourceIds(entry: PalmKnowledgeEntry): string[] {
  if (entry.sourceIds?.length) return entry.sourceIds;
  if (entry.id.startsWith("shape.")) return PALM_FEATURE_DEFINITIONS.find((feature) => feature.id === entry.id)?.sourceIds ?? [];
  if (entry.id.startsWith("line.") || entry.id.startsWith("mount.")) {
    const feature = PALM_FEATURE_DEFINITIONS.find((item) => item.id === entry.id.split(".").slice(0, 2).join("."));
    if (feature) return feature.sourceIds;
  }
  return ["cheiro-palmistry-for-all", "heron-allen-cheirosophy"];
}

function featureObservationLabel(featureId: string, value: import("./knowledge").PalmFeatureObservation, language: PalmLanguage): string {
  const feature = PALM_FEATURE_DEFINITIONS.find((item) => item.id === featureId);
  const featureLabel = language === "hi" ? feature?.labelHi ?? feature?.label : feature?.label;
  const presence = value.presence === "observed" ? (language === "hi" ? "देखा गया" : "observed")
    : value.presence === "absent" ? (language === "hi" ? "नहीं दिखा" : "not seen")
      : value.presence === "uncertain" ? (language === "hi" ? "अनिश्चित" : "uncertain")
        : (language === "hi" ? "आकलन नहीं किया" : "not assessed");
  const details = [
    value.shape !== "not-assessed" ? `${language === "hi" ? "आकार" : "shape"}: ${value.shape}` : "",
    value.depth !== "not-assessed" ? `${language === "hi" ? "गहराई" : "depth"}: ${value.depth}` : "",
    value.length !== "not-assessed" ? `${language === "hi" ? "लंबाई" : "length"}: ${value.length}` : "",
    value.direction !== "not-assessed" ? `${language === "hi" ? "दिशा" : "direction"}: ${value.direction}` : "",
    value.continuity !== "not-assessed" ? `${language === "hi" ? "निरंतरता" : "continuity"}: ${value.continuity}` : "",
    value.variation.trim() ? `${language === "hi" ? "विविधता" : "variation"}: ${value.variation}` : "",
  ].filter(Boolean);
  return `${featureLabel ?? featureId}: ${presence}${details.length ? ` · ${details.join(" · ")}` : ""}`;
}

export function detectPalmContradictions(observations: PalmObservations): string[] {
  const issues: string[] = [];
  const fields = ["shape", "depth", "length", "direction", "continuity"] as const;
  for (const [featureId, value] of Object.entries(observations.featureObservations ?? {})) {
    if (!value) continue;
    const hasDetail = fields.some((field) => value[field] !== "not-assessed") || Boolean(value.variation?.trim());
    if ((value.presence === "absent" || value.presence === "not-assessed") && hasDetail) {
      issues.push(`${featureId}: details are entered while presence is “${value.presence}”.`);
    }
    const quality = featureId.startsWith("line.") ? observations.lines[featureId.split(".")[1] as LineName] : undefined;
    if (quality && quality !== "not-observed" && value.presence === "absent") {
      issues.push(`${featureId}: legacy line quality is ${quality} while detailed presence is absent.`);
    }
    if (quality === "broken" && value.continuity === "continuous") issues.push(`${featureId}: legacy line quality is broken while detailed continuity is continuous.`);
    if (quality === "clear" && ["interrupted", "chained", "fragmented"].includes(value.continuity)) {
      issues.push(`${featureId}: legacy line quality is clear while detailed continuity is ${value.continuity}.`);
    }
    const mount = featureId.startsWith("mount.") ? observations.mounts[featureId.split(".")[1] as MountName] : undefined;
    if (mount && mount !== "not-observed" && value.presence === "absent") {
      issues.push(`${featureId}: legacy mount level is ${mount} while detailed presence is absent.`);
    }
  }
  return issues;
}

export type PalmReportComparison = { left: PalmObservations; right: PalmObservations };

const reportDefinition = [
  ["overall", "Overall Palm Reading", "समग्र हस्तरेखा-पठन", "shape.earth", "shape.air", "shape.fire", "shape.water"],
  ["hand-shape", "Hand Shape", "हाथ का आकार", "shape.earth", "shape.air", "shape.fire", "shape.water"],
  ["personality", "Personality Interpretation", "व्यक्तित्व संबंधी पारंपरिक संकेत", "shape.earth", "shape.air", "shape.fire", "shape.water", "finger.index", "finger.middle", "finger.ring", "finger.little", "finger.thumb"],
  ["thinking", "Thinking Style", "सोचने की शैली", "line.head", "secondary.intuition", "finger.index", "finger.middle"],
  ["emotional", "Emotional Tendencies", "भावनात्मक प्रवृत्तियाँ", "line.heart", "mount.venus"],
  ["heart", "Heart Line", "हृदय रेखा", "line.heart"],
  ["head", "Head Line", "मस्तिष्क रेखा", "line.head"],
  ["life", "Life Line", "जीवन रेखा", "line.life"],
  ["fate", "Fate Line", "भाग्य रेखा", "line.fate"],
  ["sun", "Sun Line", "सूर्य रेखा", "line.sun"],
  ["mercury", "Mercury Line", "बुध रेखा", "line.mercury", "secondary.health"],
  ["mounts", "Mount Analysis", "पर्वत विश्लेषण", "mount.jupiter", "mount.saturn", "mount.apollo", "mount.mercury", "mount.venus", "mount.moon", "mount.mars", "mount.upper-mars", "mount.lower-mars", "mount.plain-mars"],
  ["fingers", "Finger Analysis", "उँगलियों का विश्लेषण", "finger.index", "finger.middle", "finger.ring", "finger.little", "finger.thumb"],
  ["thumb", "Thumb Analysis", "अंगूठे का विश्लेषण", "finger.thumb"],
  ["relationships", "Relationship Tendencies", "संबंधों के पारंपरिक संकेत", "line.heart", "secondary.relationship", "secondary.venus-girdle"],
  ["marriage", "Marriage Traditions", "विवाह संबंधी परंपराएँ", "secondary.relationship"],
  ["career", "Career Tendencies", "करियर संबंधी पारंपरिक संकेत", "line.fate", "line.sun", "mount.jupiter"],
  ["business", "Business Tendencies", "व्यवसाय संबंधी पारंपरिक संकेत", "line.mercury", "mount.mercury", "finger.little"],
  ["financial", "Financial Tendencies", "वित्त संबंधी पारंपरिक संकेत", "mount.jupiter", "mount.mercury"],
  ["leadership", "Leadership", "नेतृत्व", "mount.jupiter", "finger.index"],
  ["creativity", "Creativity", "रचनात्मकता", "line.sun", "mount.apollo", "finger.ring"],
  ["travel", "Travel Traditions", "यात्रा संबंधी परंपराएँ", "secondary.travel", "mount.moon"],
  ["strengths", "Strengths", "पारंपरिक रूप से बताए गए बल", "shape.earth", "shape.air", "shape.fire", "shape.water", "mount.jupiter", "mount.apollo", "secondary.mars", "mark.square"],
  ["challenges", "Challenges", "पारंपरिक रूप से बताए गए चुनौती-विषय", "line.life", "line.head", "line.heart", "line.fate", "line.sun", "line.mercury", "secondary.venus-girdle", "mark.island", "mark.break", "mark.grille"],
  ["comparison", "Left vs Right Hand", "बायाँ और दायाँ हाथ", "shape.earth"],
  ["combined", "Combined Interpretation", "संयुक्त व्याख्या", "shape.earth", "line.life", "line.head", "line.heart", "line.fate", "line.sun", "line.mercury", "mount.jupiter", "mount.venus", "mount.moon"],
  ["summary", "Final Summary", "अंतिम सारांश", "shape.earth"],
] as const;

function observationForFeature(observations: PalmObservations, featureId: PalmFeatureId, language: PalmLanguage) {
  const detail = observations.featureObservations?.[featureId];
  if (detail && detail.presence !== "not-assessed") {
    const entry = PALM_KNOWLEDGE.find((item) => item.id === featureId);
    if (!entry) return null;
    const label = featureObservationLabel(featureId, detail, language);
    const confidence = detail.confidence;
    const base = detail.presence === "observed"
      ? (language === "hi" ? entry.contentHi ?? entry.content : entry.content)
      : detail.presence === "absent"
        ? (language === "hi" ? "यह विशेषता हाथ में नहीं देखी गई; इसलिए कोई पारंपरिक अर्थ नहीं जोड़ा गया।" : "This feature was manually marked absent; no traditional meaning is applied.")
        : (language === "hi" ? "इस विशेषता का अवलोकन अनिश्चित है; कोई निश्चित अर्थ नहीं जोड़ा गया।" : "This feature was marked uncertain; no firm interpretation is applied.");
    const sourceIds = entry.sourceIds ?? knowledgeSourceIds(entry);
    const weight = detail.presence === "observed" ? 0.6 * confidenceWeights[confidence] : 0;
    return { featureId, label, content: base, contentHi: entry.contentHi ?? base, sourceIds, confidence, weight, category: entry.category, key: entry.id };
  }

  if (featureId.startsWith("line.") && featureId.split(".").length === 2) {
    const line = featureId.split(".")[1] as LineName;
    if (line in observations.lines) {
      const quality = observations.lines[line];
      if (quality !== "not-observed") {
        const key = `line.${line}.${quality}`;
        const entry = PALM_KNOWLEDGE.find((item) => item.id === key);
        if (entry) return { featureId, label: language === "hi" ? entry.labelHi ?? entry.label : entry.label, content: entry.content, contentHi: entry.contentHi ?? entry.content, sourceIds: knowledgeSourceIds(entry), confidence: observations.observationConfidence ?? null, weight: 0.6 * (observations.observationConfidence ? confidenceWeights[observations.observationConfidence] : 0.5), category: entry.category, key };
      }
    }
  }

  if (featureId.startsWith("mount.") && featureId.split(".").length === 2) {
    const mount = featureId.split(".")[1] as MountName;
    if (mount in observations.mounts) {
      const level = observations.mounts[mount];
      if (level !== "not-observed") {
        const key = `mount.${mount}.${level}`;
        const entry = PALM_KNOWLEDGE.find((item) => item.id === key);
        if (entry) return { featureId, label: language === "hi" ? entry.labelHi ?? entry.label : entry.label, content: entry.content, contentHi: entry.contentHi ?? entry.content, sourceIds: knowledgeSourceIds(entry), confidence: observations.observationConfidence ?? null, weight: 0.6 * (observations.observationConfidence ? confidenceWeights[observations.observationConfidence] : 0.5), category: entry.category, key };
      }
    }
  }

  if (featureId.startsWith("shape.") && featureId === `shape.${observations.handShape}`) {
    const entry = PALM_KNOWLEDGE.find((item) => item.id === featureId);
    if (entry) return { featureId, label: language === "hi" ? entry.labelHi ?? entry.label : entry.label, content: entry.content, contentHi: entry.contentHi ?? entry.content, sourceIds: knowledgeSourceIds(entry), confidence: observations.observationConfidence ?? null, weight: 0.6 * (observations.observationConfidence ? confidenceWeights[observations.observationConfidence] : 0.5), category: entry.category, key: entry.id };
  }

  return null;
}

function evidenceForSection(observations: PalmObservations, featureIds: readonly string[], language: PalmLanguage) {
  const seen = new Set<string>();
  const results = [];
  for (const featureId of featureIds) {
    if (seen.has(featureId)) continue;
    seen.add(featureId);
    const result = observationForFeature(observations, featureId as PalmFeatureId, language);
    if (result) results.push(result);
  }
  if ((featureIds.includes("finger.index") || featureIds.includes("finger.thumb")) && observations.fingerLength) {
    const entry = PALM_KNOWLEDGE.find((item) => item.id === `finger.${observations.fingerLength}`);
    if (entry && !results.some((item) => item.key === entry.id)) {
      results.push({
        featureId: "finger.length",
        label: language === "hi" ? entry.labelHi ?? entry.label : entry.label,
        content: entry.content,
        contentHi: entry.contentHi ?? entry.content,
        sourceIds: knowledgeSourceIds(entry),
        confidence: observations.observationConfidence ?? null,
        weight: 0.6 * (observations.observationConfidence ? confidenceWeights[observations.observationConfidence] : 0.5),
        category: entry.category,
        key: entry.id,
      });
    }
  }
  if (featureIds.includes("finger.thumb")) {
    const entry = PALM_KNOWLEDGE.find((item) => item.id === `thumb.${observations.thumb}`);
    if (entry && !results.some((item) => item.key === entry.id)) {
      results.push({
        featureId: "thumb",
        label: language === "hi" ? entry.labelHi ?? entry.label : entry.label,
        content: entry.content,
        contentHi: entry.contentHi ?? entry.content,
        sourceIds: knowledgeSourceIds(entry),
        confidence: observations.observationConfidence ?? null,
        weight: 0.6 * (observations.observationConfidence ? confidenceWeights[observations.observationConfidence] : 0.5),
        category: entry.category,
        key: entry.id,
      });
    }
  }
  return results;
}

function makeSection(id: string, label: string, labelHi: string, featureIds: readonly string[], observations: PalmObservations, language: PalmLanguage, comparison?: PalmReportComparison): PalmReportSection {
  const sectionFeatureIds = id === "comparison" ? [] : id === "combined" || id === "overall" ? PALM_FEATURE_IDS : featureIds;
  const build = (outputLanguage: PalmLanguage) => {
    const evidence = evidenceForSection(observations, sectionFeatureIds, outputLanguage);
    const rendered = evidence.map((item) => `${item.label}: ${outputLanguage === "hi" ? item.contentHi : item.content}`);
    const unique = [...new Set(rendered.map((item) => item.replace(/\s+/g, " ").trim()))];
    let interpretation = unique.length ? unique.join("\n\n") : outputLanguage === "hi"
      ? "इस भाग के लिए कोई अवलोकन दर्ज नहीं है; इसलिए कोई व्याख्या नहीं दी गई।"
      : "No matching observation was entered; no interpretation is supplied.";
    if (id === "overall") interpretation = outputLanguage === "hi"
      ? `${evidence.length} संबंधित अवलोकन शामिल हैं। केवल दर्ज की गई जानकारी का सार है।`
      : `${evidence.length} related manual observation(s) are included. This is a summary of recorded inputs only.`;
    if (id === "marriage") interpretation += outputLanguage === "hi"
      ? "\n\nइन पारंपरिक संकेतों से विवाह की तारीख, साथी या परिणाम नहीं बताए जा सकते।"
      : "\n\nThese traditional signs do not establish marriage dates, partners, or outcomes.";
    if (id === "career" || id === "business" || id === "financial") interpretation += outputLanguage === "hi"
      ? "\n\nयह भविष्यवाणी या पेशेवर सलाह नहीं है।"
      : "\n\nThis is not a prediction or professional advice.";
    if (id === "comparison") {
      if (!comparison) {
        interpretation = outputLanguage === "hi" ? "दूसरे हाथ का अवलोकन नहीं दिया गया।" : "No observation for the other hand was provided.";
      } else {
        const differences = comparePalmObservations(comparison.left, comparison.right);
        interpretation = differences.length
          ? `${outputLanguage === "hi" ? "बायाँ / दायाँ:" : ""}\n${differences.map((item) => `${item.label}: ${item.leftObservation} / ${item.rightObservation}`).join("\n")}`
          : outputLanguage === "hi" ? "दोनों हाथों की दर्ज की गई विशेषताएँ समान हैं।" : "The recorded observations are the same for both hands.";
      }
    }
    return { evidence, interpretation };
  };
  const english = build("en");
  const hindi = build("hi");
  const selected = language === "hi" ? hindi : english;
  const sourceIds = [...new Set(english.evidence.flatMap((item) => item.sourceIds))];
  const weightedEvidence = english.evidence.map((item) => ({ featureId: item.featureId, confidence: item.confidence, weight: item.weight }));
  return {
    category: english.evidence[0]?.category ?? "hand shape",
    observation: label,
    interpretation: selected.interpretation,
    interpretationHi: hindi.interpretation,
    knowledgeId: `report.${id}`,
    sources: sourceIds,
    evidence: weightedEvidence,
    futureOriented: ["marriage", "career", "business", "financial", "travel"].includes(id),
  };
}

export function generatePalmReport(
  observations: PalmObservations,
  side: PalmSide,
  language: PalmLanguage = "en",
  comparison?: PalmReportComparison,
): PalmReport {
  const sections = reportDefinition.map(([id, label, labelHi, ...featureIds]) =>
    makeSection(id, language === "hi" ? labelHi : label, labelHi, featureIds, observations, language, comparison));
  const contradictions = detectPalmContradictions(observations);
  return {
    title: language === "hi" ? `${labelPalmSide(side)} का पठन` : `${labelPalmSide(side)} reading`,
    summary: language === "hi"
      ? `${sections.length} भाग। सभी अर्थ परंपरागत सांस्कृतिक मान्यताएँ हैं।`
      : `${sections.length} sections. All interpretations are traditional cultural beliefs.`,
    sections,
    disclaimer: language === "hi"
      ? "केवल सांस्कृतिक और मनोरंजन उद्देश्य के लिए। हस्तरेखा-विज्ञान वैज्ञानिक रूप से प्रमाणित नहीं है। यह रिपोर्ट जीवनकाल, मृत्यु, रोग, विवाह की तारीख, धन या भविष्य की गारंटी नहीं देती; यह चिकित्सकीय, मनोवैज्ञानिक, वित्तीय या अन्य पेशेवर सलाह नहीं है।"
      : "For cultural and entertainment purposes only. Palmistry is not scientifically validated. This report does not predict lifespan, death, disease, marriage dates, wealth, or guaranteed outcomes, and is not medical, psychological, financial, or other professional advice.",
    language,
    contradictions,
    dominantHand: observations.dominantHand ?? "unknown",
    confidenceNotice: language === "hi"
      ? "दृश्य-अवलोकन का विश्वास स्तर उपयोगकर्ता द्वारा चुना गया है; यह भविष्यवाणी की सटीकता नहीं बताता।"
      : "Visual-observation confidence is self-selected and does not measure predictive accuracy.",
  };
}

export function auditPalmKnowledgeBase() {
  const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const contentCounts = new Map<string, number>();
  const idCounts = new Map<string, number>();
  const validSourceIds = new Set(PALM_SOURCES.map((source) => source.id));
  const unsupportedPattern = /\b(?:you will live|you will die|guaranteed to|certain to marry|will marry on|predicts a disease)\b/i;
  for (const entry of PALM_KNOWLEDGE) {
    contentCounts.set(normalize(entry.content), (contentCounts.get(normalize(entry.content)) ?? 0) + 1);
    idCounts.set(entry.id, (idCounts.get(entry.id) ?? 0) + 1);
  }
  const duplicateIds = [...idCounts].filter(([, count]) => count > 1).map(([id]) => id);
  const duplicateInterpretations = [...contentCounts].filter(([, count]) => count > 1).map(([content]) => content);
  const missingExplanations = PALM_KNOWLEDGE.filter((entry) => !entry.content.trim() || !entry.label.trim()).map((entry) => entry.id);
  const missingSources = PALM_KNOWLEDGE.filter((entry) => knowledgeSourceIds(entry).length === 0).map((entry) => entry.id);
  const unknownSources = PALM_KNOWLEDGE.flatMap((entry) => knowledgeSourceIds(entry).filter((sourceId) => !validSourceIds.has(sourceId)).map((sourceId) => `${entry.id}:${sourceId}`));
  const unsupportedPredictions = PALM_KNOWLEDGE.filter((entry) => unsupportedPattern.test(`${entry.content} ${entry.contentHi ?? ""} ${entry.alternative ?? ""}`)).map((entry) => entry.id);
  const referencedKnowledgeIds = new Set([
    ...PALM_FEATURE_IDS,
    ...LINE_NAMES.flatMap((line) => LINE_QUALITIES.filter((quality) => quality !== "not-observed").map((quality) => `line.${line}.${quality}`)),
    ...MOUNT_NAMES.flatMap((mount) => MOUNT_LEVELS.filter((level) => level !== "not-observed").map((level) => `mount.${mount}.${level}`)),
    "finger.short", "finger.average", "finger.long", "thumb.flexible", "thumb.balanced", "thumb.firm",
  ]);
  const unusedKnowledgeEntries = PALM_KNOWLEDGE.filter((entry) => !referencedKnowledgeIds.has(entry.id)).map((entry) => entry.id);
  const unusedFeatures = PALM_FEATURE_DEFINITIONS.filter((feature) =>
    !PALM_RULES.some((rule) => rule.featureId === feature.id) || !PALM_KNOWLEDGE.some((entry) => entry.id === feature.id),
  ).map((feature) => feature.id);
  const invalidRuleCombinations = PALM_RULES.filter((rule) =>
    !PALM_FEATURE_IDS.includes(rule.featureId) || !Number.isFinite(rule.weight) || rule.weight <= 0 || rule.weight > 1
      || rule.sourceIds.some((sourceId) => !validSourceIds.has(sourceId) || !PALM_SOURCES_BY_TRADITION[rule.tradition].includes(sourceId))
      || !PALM_FEATURE_DEFINITIONS.find((feature) => feature.id === rule.featureId)?.traditions.includes(rule.tradition),
  ).map((rule) => rule.id);
  const undocumentedTraditionDifferences = PALM_TRADITION_DIFFERENCES.filter((difference) =>
    !difference.note.trim() || difference.sourceIds.length === 0 || difference.sourceIds.some((sourceId) => !validSourceIds.has(sourceId)),
  ).map((difference) => difference.id);
  const issues = {
    duplicateIds,
    duplicateInterpretations,
    missingExplanations,
    missingSources,
    unknownSources,
    unusedKnowledgeEntries,
    unusedFeatures,
    unsupportedPredictions,
    invalidRuleCombinations,
    undocumentedTraditionDifferences,
  };
  return {
    ok: Object.values(issues).every((list) => list.length === 0),
    statistics: {
      features: PALM_FEATURE_DEFINITIONS.length,
      knowledgeEntries: PALM_KNOWLEDGE.length,
      rules: PALM_RULES.length,
      sources: PALM_SOURCES.length,
      reportSections: reportDefinition.length,
      categories: [...new Set(PALM_FEATURE_DEFINITIONS.map((feature) => feature.category))],
    },
    documentedTraditionDifferences: PALM_TRADITION_DIFFERENCES.length,
    issues,
  };
}

export function comparePalmObservations(left: PalmObservations, right: PalmObservations): PalmComparison {
  const differences: PalmComparison = [];
  const compare = (label: string, leftObservation: string, rightObservation: string) => {
    if (leftObservation !== rightObservation) differences.push({ label, leftObservation, rightObservation });
  };
  const detailed = (observations: PalmObservations, featureId: PalmFeatureId) => observations.featureObservations?.[featureId];
  const hasDetail = (featureId: PalmFeatureId) => [left, right].some((observations) => {
    const value = detailed(observations, featureId);
    return value && (value.presence !== "not-assessed" || value.shape !== "not-assessed" || value.depth !== "not-assessed"
      || value.length !== "not-assessed" || value.direction !== "not-assessed" || value.continuity !== "not-assessed" || Boolean(value.variation.trim()));
  });
  compare("Hand shape", shapeLabels[left.handShape], shapeLabels[right.handShape]);
  if (!hasDetail("finger.index")) compare("Finger length", fingerLabels[left.fingerLength], fingerLabels[right.fingerLength]);
  if (!hasDetail("finger.thumb")) compare("Thumb", thumbLabels[left.thumb], thumbLabels[right.thumb]);
  for (const line of LINE_NAMES) {
    const featureId = `line.${line}` as PalmFeatureId;
    if (!hasDetail(featureId)) compare(lineLabels[line], lineQualityLabels[left.lines[line]], lineQualityLabels[right.lines[line]]);
  }
  for (const mount of MOUNT_NAMES) {
    const featureId = `mount.${mount}` as PalmFeatureId;
    if (!hasDetail(featureId)) compare(mountLabels[mount], mountLevelLabels[left.mounts[mount]], mountLevelLabels[right.mounts[mount]]);
  }
  for (const feature of PALM_FEATURE_DEFINITIONS) {
    const leftValue = detailed(left, feature.id);
    const rightValue = detailed(right, feature.id);
    if (!leftValue && !rightValue) continue;
    const leftLabel = leftValue ? featureObservationLabel(feature.id, leftValue, "en") : "not assessed";
    const rightLabel = rightValue ? featureObservationLabel(feature.id, rightValue, "en") : "not assessed";
    if (JSON.stringify(leftValue ?? null) !== JSON.stringify(rightValue ?? null)) {
      differences.push({ label: feature.label, leftObservation: leftLabel, rightObservation: rightLabel });
    }
  }
  return differences;
}

export function searchPalmKnowledge(query: string, limit = 20): PalmKnowledgeEntry[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  if (!Number.isInteger(limit) || limit < 1) throw new Error("Search result limit must be a positive integer.");
  return PALM_KNOWLEDGE.filter((entry) => {
    const searchable = `${entry.label} ${entry.category} ${entry.keywords.join(" ")} ${entry.content} ${entry.contentHi ?? ""} ${entry.alternative ?? ""}`.toLocaleLowerCase();
    return terms.every((term) => searchable.includes(term));
  }).slice(0, limit);
}

const questionStopWords = new Set([
  "a", "an", "and", "are", "about", "can", "does", "do", "explain", "for", "how", "i",
  "in", "is", "it", "me", "mean", "means", "my", "of", "please", "palmistry", "tell",
  "that", "the", "this", "to", "what", "when", "where", "which", "who", "why", "you",
]);

export function answerPalmQuestion(question: string, language: PalmLanguage = "en"): PalmQuestionAnswer | null {
  if (typeof question !== "string" || question.trim().length === 0 || question.length > 240) {
    throw new Error("Enter a question of 1 to 240 characters.");
  }
  const terms = [...new Set(
  question.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter((term) => term.length > 1 && !questionStopWords.has(term)) ?? [],
  )];
  if (terms.length === 0) return null;
  const matches = PALM_KNOWLEDGE.map((entry) => {
    const text = `${entry.label} ${entry.category} ${entry.keywords.join(" ")} ${entry.content} ${entry.contentHi ?? ""} ${entry.alternative ?? ""}`.toLocaleLowerCase();
    const score = terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0);
    return { entry, score };
  }).filter((result) => result.score >= Math.min(terms.length, 2))
    .sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label))
    .filter((result, index, results) => result.score === results[0].score)
    .slice(0, 3);
  if (matches.length === 0) return null;
  return {
    answer: matches.map(({ entry }) => language === "hi" ? entry.contentHi ?? entry.content : entry.content).join("\n\n"),
    sources: matches.map(({ entry }) => entry),
    disclaimer: "This answer only retrieves bundled traditional palmistry reference text. It is not personalized advice or a scientific or predictive assessment.",
  };
}
