import type { Language } from "./language";
import type { Remedy, RemedyCategory, RemedyProblem } from "./remedies";
import { hasUsableChartProvenance, type ProvenancedChart } from "./chart-provenance.ts";

export const PERSONALIZED_REMEDIES_RULESET_VERSION = "life-remedies-1.0.0";
export type RemedyRuleLifecycle = "DRAFT" | "SOURCE_PENDING" | "REVIEW_REQUIRED" | "APPROVED" | "REJECTED" | "RETIRED";
export type RemedySourceStatus = "verified" | "pending" | "unavailable" | "disputed";
export type RemedyRuleSource = {
  title: string | null;
  author: string | null;
  passageLocator: string | null;
  editionOrUrl: string | null;
  status: RemedySourceStatus;
};
export type RemedyRuleReview = {
  reviewer: string | null;
  approvalStatus: "not-reviewed" | "approved" | "rejected";
  reviewedAt: string | null;
  safetyChecked: boolean;
};

export type RemedyChart = ProvenancedChart & {
  input?: ProvenancedChart["input"] & {
    localDate?: string;
    localTime?: string;
    birthPlace?: string | null;
    birthTimeAccuracy?: string;
  };
  settings?: ProvenancedChart["settings"] & { engine?: string };
  planets?: { name: string; sign: string; house: number }[];
  vimshottariDasha?: {
    mahadashas?: {
      lord: string;
      start: string;
      end: string;
      antardashas?: { lord: string; start: string; end: string }[];
    }[];
  };
};

export type RemedyRule = {
  id: string;
  version: string;
  remedyId: string;
  concerns: RemedyProblem[];
  category: RemedyCategory;
  lifecycle: RemedyRuleLifecycle;
  requiredInputs: string[];
  applicableFactors: string[];
  source: RemedyRuleSource;
  review: RemedyRuleReview;
  safetyExclusions: string[];
  confidence: "high" | "medium" | "low" | "not-assessed";
  matches: (chart: RemedyChart, now: Date) => boolean;
  rationale: (language: Language) => string;
};

export type PersonalizedRemedy = {
  remedy: Remedy;
  ruleId: string;
  ruleVersion: string;
  tradition: RemedyCategory;
  reason: string;
  chartFacts: string[];
  applicableFactors: string[];
  sourceStatus: RemedySourceStatus;
  confidence: RemedyRule["confidence"];
  cost: number | null;
  costStatus: "configured" | "unknown";
  freeAlternative: string;
  safety: string;
  limitations: string[];
};

export type PersonalizedRemedyResult = {
  status: "personalized" | "no_supported_rule" | "needs_chart";
  rulesetVersion: string;
  chart: {
    resultHash: string;
    calculationVersion: string;
    ruleSetVersion: string | null;
    calculatedAt: string | null;
    birthProfile: string | null;
  } | null;
  currentDasha: { mahadasha: string; antardasha: string | null; start: string; end: string } | null;
  recommendations: PersonalizedRemedy[];
  explanation: Record<Language, string>;
};

export const draftRemedyRules: readonly RemedyRule[] = [
  {
    id: "candidate-planetary-discipline",
    version: "0.1.0",
    remedyId: "daily-gratitude-discipline",
    concerns: ["discipline", "career"],
    category: "sattvik",
    lifecycle: "SOURCE_PENDING",
    requiredInputs: ["calculated chart provenance", "documented planetary or house factor"],
    applicableFactors: ["Not specified until a source and tradition-specific method are reviewed."],
    source: { title: null, author: null, passageLocator: null, editionOrUrl: null, status: "pending" },
    review: { reviewer: null, approvalStatus: "not-reviewed", reviewedAt: null, safetyChecked: false },
    safetyExclusions: ["Do not replace medical, legal, financial, or employment support."],
    confidence: "not-assessed",
    matches: () => false,
    rationale: () => "Pending source and methodology review.",
  },
  {
    id: "candidate-dasha-reflection",
    version: "0.1.0",
    remedyId: "planetary-chart-reflection",
    concerns: ["planetary"],
    category: "sattvik",
    lifecycle: "REVIEW_REQUIRED",
    requiredInputs: ["calculated chart provenance", "validated Vimshottari Dasha interval"],
    applicableFactors: ["No Dasha-to-remedy correspondence has been approved."],
    source: { title: null, author: null, passageLocator: null, editionOrUrl: null, status: "unavailable" },
    review: { reviewer: null, approvalStatus: "not-reviewed", reviewedAt: null, safetyChecked: false },
    safetyExclusions: ["Never present symbolic timing as a guaranteed event or treatment."],
    confidence: "not-assessed",
    matches: () => false,
    rationale: () => "Pending methodology and human review.",
  },
];

// No chart-to-remedy rule is active until its tradition and source have been
// reviewed. General catalog entries must not become personalized by accident.
export const approvedRemedyRules: readonly RemedyRule[] = [];

export function isActivatableRemedyRule(rule: RemedyRule): boolean {
  return rule.lifecycle === "APPROVED"
    && rule.source.status === "verified"
    && rule.review.approvalStatus === "approved"
    && rule.review.safetyChecked
    && rule.requiredInputs.length > 0
    && rule.applicableFactors.length > 0
    && Boolean(rule.source.title && rule.source.author && rule.source.passageLocator && rule.source.editionOrUrl)
    && rule.safetyExclusions.length > 0;
}

function currentDasha(chart: RemedyChart, now: Date) {
  const instant = now.getTime();
  for (const maha of chart.vimshottariDasha?.mahadashas ?? []) {
    const mahaStart = Date.parse(maha.start);
    const mahaEnd = Date.parse(maha.end);
    if (!(mahaStart <= instant && instant < mahaEnd)) continue;
    const antara = maha.antardashas?.find((period) => Date.parse(period.start) <= instant && instant < Date.parse(period.end)) ?? null;
    return { mahadasha: maha.lord, antardasha: antara?.lord ?? null, start: maha.start, end: maha.end };
  }
  return null;
}

function chartFacts(chart: RemedyChart) {
  return [
    ...(chart.planets ?? []).slice(0, 4).map((planet) => `${planet.name}: ${planet.sign}, house ${planet.house}`),
    ...(chart.input?.birthTimeAccuracy ? [`Birth-time accuracy: ${chart.input.birthTimeAccuracy}`] : []),
  ];
}

export function evaluatePersonalizedRemedies(
  chart: RemedyChart | null,
  catalog: readonly Remedy[],
  language: Language,
  concern: RemedyProblem | "all" = "all",
  now = new Date(),
  rules: readonly RemedyRule[] = approvedRemedyRules,
): PersonalizedRemedyResult {
  if (!chart || !hasUsableChartProvenance(chart)) {
    return {
      status: "needs_chart",
      rulesetVersion: PERSONALIZED_REMEDIES_RULESET_VERSION,
      chart: null,
      currentDasha: null,
      recommendations: [],
      explanation: {
        en: "A successfully calculated chart with valid provenance is required before personalized remedies can be evaluated.",
        hi: "व्यक्तिगत उपायों का मूल्यांकन करने से पहले सही provenance वाली सफलतापूर्वक गणना की गई कुंडली आवश्यक है।",
        hinglish: "Personalized remedies evaluate karne se pehle valid provenance wala successfully calculated chart zaroori hai.",
      },
    };
  }

  const chartRecord = {
    resultHash: chart.provenance.resultHash,
    calculationVersion: chart.provenance.engineVersion,
    ruleSetVersion: chart.provenance.ruleSetVersion ?? chart.settings?.ruleSetVersion ?? null,
    calculatedAt: chart.provenance.calculatedAt ?? chart.input?.utc ?? null,
    birthProfile: chart.input?.birthPlace ?? null,
  };
  const current = currentDasha(chart, now);
  const facts = chartFacts(chart);
  const seenRemedies = new Set<string>();
  const recommendations = [...rules]
    .sort((left, right) => left.id.localeCompare(right.id) || left.version.localeCompare(right.version))
    .filter((rule) => (concern === "all" || rule.concerns.includes(concern))
      && isActivatableRemedyRule(rule)
      && !seenRemedies.has(rule.remedyId)
      && rule.matches(chart, now))
    .map((rule) => {
      seenRemedies.add(rule.remedyId);
      return rule;
    })
    .map((rule) => {
      const remedy = catalog.find((item) => item.id === rule.remedyId);
      if (!remedy) return null;
      return {
        remedy,
        ruleId: rule.id,
        ruleVersion: rule.version,
        tradition: rule.category,
        reason: rule.rationale(language),
        chartFacts: facts,
        applicableFactors: rule.applicableFactors,
        sourceStatus: rule.source.status,
        confidence: rule.confidence,
        cost: remedy.price,
        costStatus: remedy.price === null ? "unknown" : "configured",
        freeAlternative: remedy.freeAlternative[language],
        safety: remedy.safety[language],
        limitations: ["This is a traditional rule classification, not a proven treatment or guaranteed outcome."],
      };
    })
    .filter((item): item is PersonalizedRemedy => item !== null);

  return {
    status: recommendations.length ? "personalized" : "no_supported_rule",
    rulesetVersion: PERSONALIZED_REMEDIES_RULESET_VERSION,
    chart: chartRecord,
    currentDasha: current,
    recommendations,
    explanation: recommendations.length
      ? {
        en: "The displayed recommendation matched a reviewed rule using this calculated chart.",
        hi: "दिखाया गया सुझाव इस गणना की गई कुंडली पर समीक्षा किए गए नियम से मेल खाता है।",
        hinglish: "Dikhaya gaya suggestion is calculated chart par reviewed rule se match hua hai.",
      }
      : {
        en: "No sufficiently supported chart-specific remedy rule is active. General traditional practices remain available below and are not personalized.",
        hi: "कुंडली-विशिष्ट उपाय का कोई पर्याप्त समर्थित सक्रिय नियम नहीं है। नीचे दिए सामान्य पारंपरिक अभ्यास व्यक्तिगत सुझाव नहीं हैं।",
        hinglish: "Koi sufficiently supported chart-specific remedy rule active nahi hai. Neeche ke general practices personalized nahi hain.",
      },
  };
}
