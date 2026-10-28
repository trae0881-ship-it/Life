import { interpretChart, type InterpretationChart } from "../interpretation/rules.ts";
import type { InterpretationCategory } from "../interpretation/catalog.ts";
import { assistantQuestionCatalog, type AssistantQuestionId } from "./assistant-questions.ts";
import { languages, translate, type Language } from "./language.ts";
import { calculateMarriageTiming, type MarriageTimingChart } from "./marriage-timing.ts";
import { formatMarriageAnswer } from "./assistant-answer-format.ts";
import { calculateTransits } from "../calculation/events.ts";

export type AssistantTopic =
  | "basics"
  | "career"
  | "business"
  | "relationships"
  | "vargas"
  | "dasha"
  | "transits"
  | "yogas"
  | "kp"
  | "panchanga"
  | "interpretation";

export type AssistantChart = Omit<InterpretationChart, "planets" | "transits" | "input" | "settings"> & {
  input: InterpretationChart["input"] & { latitude?: number; longitude?: number; fullName?: string | null; birthPlace?: string | null; birthTimeAccuracy?: string };
  settings?: InterpretationChart["settings"] & { node?: string; houseSystem?: string; ayanamsa?: string; engine?: string; ruleSetVersion?: string };
  planets: (InterpretationChart["planets"][number] & { nakshatra?: string; pada?: number })[];
  transits?: Omit<NonNullable<InterpretationChart["transits"]>, "bodies"> & {
    horizonDays?: number;
    method?: string;
    limitations?: string[];
    bodies: (NonNullable<InterpretationChart["transits"]>["bodies"][number] & {
      nakshatra?: string;
      pada?: number;
      nextSignIngress?: { utc: string; fromSign: string; toSign: string; direction: string; refinementDays: number } | null;
    })[];
  };
  divisionalCharts?: Record<string, { name: string; sign: string; degreesInSign: number; convention?: string }[]>;
  panchanga?: {
    nakshatra?: { name: string; pada: number };
    tithi?: { name: string; paksha: string };
    yoga?: string;
    karana?: string;
    weekday?: string;
  };
  kp?: { system?: string; ayanamsa?: string; houseSystem?: string; planets?: { name: string; nakshatra: { lord: string }; sub: { lord: string }; subSub: { lord: string }; significations: { houses: number[] } }[]; cusps?: { house: number; signLord: string; nakshatra: { lord: string }; sub: { lord: string }; subSub: { lord: string }; signifiedBy: string[] }[] } | null;
  vara?: { civilWeekday: string; sunriseBasedVara: string | null; status: string };
  riseSet?: { sunrise: { status: string; localTime: string | null }; sunset: { status: string; localTime: string | null }; moonrise: { status: string; localTime: string | null }; moonset: { status: string; localTime: string | null } };
  provenance?: { resultHash: string; engineVersion: string; ruleSetVersion?: string; calculatedAt?: string; status: string };
};

export type AssistantAnswer = {
  topic: AssistantTopic | null;
  status: "answered" | "limited" | "unavailable" | "unsupported" | "needs-chart";
  title: string;
  explanation: string;
  evidence: string[];
  limitations: string[];
  followUpIds: AssistantQuestionId[];
  evidenceDisclosure: string;
  disclaimer: string;
  provenance: { chartId: string | null; calculationVersion: string | null; ruleSetVersion: string | null; calculatedAt: string | null } | null;
  timing?: {
    startDate: string;
    endDate: string;
    formattedStart: string;
    formattedEnd: string;
  } | null;
};

export function isAssistantChart(value: unknown): value is AssistantChart {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const chart = value as Record<string, unknown>;
  const input = chart.input;
  const ascendant = chart.ascendant;
  return Boolean(
    input && typeof input === "object" && typeof (input as Record<string, unknown>).utc === "string"
    && ascendant && typeof ascendant === "object"
    && typeof (ascendant as Record<string, unknown>).sign === "string"
    && typeof (ascendant as Record<string, unknown>).longitude === "number"
    && Array.isArray(chart.planets)
    && Array.isArray(chart.planetaryDignity)
    && Array.isArray(chart.yogasAndDoshas)
    && chart.vimshottariDasha && typeof chart.vimshottariDasha === "object"
    && Array.isArray((chart.vimshottariDasha as Record<string, unknown>).mahadashas),
  );
}

const categories: Partial<Record<AssistantTopic, InterpretationCategory[]>> = {
  career: ["Career", "Education"],
  business: ["Business", "Finances"],
  relationships: ["Relationships"],
};

const topicKeys: Record<AssistantTopic, { title: string; explanation: string }> = {
  basics: { title: "assistant.topic.basics", explanation: "assistant.answer.basics" },
  career: { title: "assistant.topic.career", explanation: "assistant.answer.career" },
  business: { title: "assistant.topic.business", explanation: "assistant.answer.business" },
  relationships: { title: "assistant.topic.relationships", explanation: "assistant.answer.relationships" },
  vargas: { title: "assistant.topic.vargas", explanation: "assistant.answer.vargas" },
  dasha: { title: "assistant.topic.dasha", explanation: "assistant.answer.dasha" },
  transits: { title: "assistant.topic.transits", explanation: "assistant.answer.transits" },
  yogas: { title: "assistant.topic.yogas", explanation: "assistant.answer.yogas" },
  kp: { title: "assistant.topic.kp", explanation: "assistant.answer.kp" },
  panchanga: { title: "assistant.topic.panchanga", explanation: "assistant.answer.panchanga" },
  interpretation: { title: "assistant.topic.interpretation", explanation: "assistant.answer.interpretation" },
};

const categoryTerms: Record<string, AssistantTopic> = {
  personality: "basics", lagna: "basics", moon: "basics", nakshatra: "basics", लग्न: "basics", चंद्र: "basics", नक्षत्र: "basics",
  career: "career", education: "career", नौकरी: "career", करियर: "career", शिक्षा: "career",
  business: "business", finance: "business", money: "business", धन: "business", व्यापार: "business", पैसा: "business",
  marriage: "relationships", relationship: "relationships", शादी: "relationships", विवाह: "relationships", संबंध: "relationships",
  d1: "vargas", d9: "vargas", d10: "vargas", divisional: "vargas", navamsa: "vargas", दशमांश: "vargas", नवांश: "vargas",
  dasha: "dasha", mahadasha: "dasha", antardasha: "dasha", दशा: "dasha",
  transit: "transits", गोचर: "transits",
  yoga: "yogas", dosha: "yogas", योग: "yogas", दोष: "yogas",
  kp: "kp", krishnamurti: "kp",
  panchanga: "panchanga", tithi: "panchanga", karana: "panchanga", पंचांग: "panchanga", तिथि: "panchanga",
  interpretation: "interpretation", evidence: "interpretation", why: "interpretation", नियम: "interpretation", व्याख्या: "interpretation",
};

function inferTopic(query: string): AssistantTopic | null {
  const normalized = query.toLocaleLowerCase();
  for (const [term, topic] of Object.entries(categoryTerms)) {
    if (normalized.includes(term)) return topic;
  }
  return null;
}

function normalizedQuestion(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").trim().replace(/\s+/g, " ");
}

function localize(language: Language, key: string): string {
  return translate(language, key);
}

function questionExplanation(language: Language, questionId: AssistantQuestionId | undefined, fallbackKey: string): string {
  if (language === "en" && questionId) return localize(language, `assistant.answer.question.${questionId}`);
  const localizedAnswer = localize(language, fallbackKey);
  return questionId
    ? `${localize(language, `assistant.popular.${questionId}`)}\n\n${localizedAnswer}`
    : localizedAnswer;
}

function currentPeriod<T extends { start: string; end: string }>(periods: T[], at: number): T | undefined {
  return periods.find((period) => Date.parse(period.start) <= at && at < Date.parse(period.end));
}

const followUps: Partial<Record<AssistantTopic, AssistantQuestionId[]>> = {
  relationships: ["marriage_factors", "marriage_dasha", "compatibility"],
  career: ["government_indicators", "career_growth", "job_transit_dasha"],
  business: ["business_job_difference", "financial_growth", "financial_timing"],
  dasha: ["marriage_dasha", "government_dasha", "career_dasha"],
  transits: ["next_12_months_transits", "job_transit_dasha"],
  vargas: ["navamsa", "marriage_factors", "career_growth"],
  yogas: ["strongest_indicators", "marriage_factors", "career_growth"],
  interpretation: ["strongest_indicators", "required_data"],
};

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

function reportEvidence(items: ReturnType<typeof interpretChart>["sections"][number]["interpretations"]): string[] {
  return unique(items.flatMap((item) => [
    `${item.title}: ${item.factors.join("; ")}`,
    `Rule convention (not a source-reviewed outcome rule): ${item.rule}`,
    `Rule provenance: ${item.ruleSource}`,
    `Matched chart conditions: ${item.matchedConditions.join("; ")}`,
    ...(item.conflicts.length ? [`Conflicting chart factors: ${item.conflicts.join("; ")}`] : []),
  ]));
}

function questionRuleEvidence(questionId: AssistantQuestionId | undefined, items: ReturnType<typeof interpretChart>["sections"][number]["interpretations"]): string[] {
  const evidence = reportEvidence(items);
  const rule = questionId === "marriage_factors" || questionId === "partner_indicators"
    ? "Project-selected relationship context: houses 2, 7 and 8 with Venus and Jupiter placements; not a source-reviewed outcome rule."
    : questionId === "government_indicators" || questionId === "career_growth"
      ? "Project-selected career context: houses 6, 10 and 11 with Saturn, Sun and Mercury placements; not a government-employment or source-reviewed outcome rule."
      : undefined;
  return rule && evidence.length ? unique([rule, ...evidence]) : evidence;
}

function upcomingDashaEvidence(chart: AssistantChart, at: Date): string[] {
  const horizonEnd = at.getTime() + chart.vimshottariDasha.convention.yearDays * 86_400_000;
  return chart.vimshottariDasha.mahadashas
    .filter((period) => Date.parse(period.end) > at.getTime() && Date.parse(period.start) < horizonEnd)
    .slice(0, 3)
    .flatMap((period) => [
      `Mahadasha: ${period.lord} (${period.start} – ${period.end})`,
      ...period.antardashas
        .filter((subperiod) => Date.parse(subperiod.end) > at.getTime() && Date.parse(subperiod.start) < horizonEnd)
        .slice(0, 3)
        .map((subperiod) => `Antardasha: ${period.lord}/${subperiod.lord} (${subperiod.start} – ${subperiod.end})`),
    ]);
}

function marriageTimingChart(chart: AssistantChart): MarriageTimingChart | null {
  if (!chart.kp?.planets?.length || !chart.kp.cusps?.length || !chart.input.timeZone) return null;
  return {
    input: { timeZone: chart.input.timeZone },
    settings: { ayanamsa: chart.settings?.ayanamsa ?? "not specified", houseSystem: chart.settings?.houseSystem ?? "not specified" },
    kp: {
      system: chart.kp.system ?? "KP",
      ayanamsa: chart.kp.ayanamsa ?? "Krishnamurti",
      houseSystem: chart.kp.houseSystem ?? "Placidus",
      planets: chart.kp.planets.map((planet) => ({ name: planet.name, significations: planet.significations })),
      cusps: chart.kp.cusps.map((cusp) => ({
        house: cusp.house,
        sub: cusp.sub,
        subSub: cusp.subSub,
        nakshatra: cusp.nakshatra,
        sign: "",
        signLord: cusp.signLord,
        signifiedBy: cusp.signifiedBy,
      })),
    },
    vimshottariDasha: chart.vimshottariDasha,
    transits: chart.transits
      ? {
        instantUtc: chart.transits.instantUtc,
        horizonDays: chart.transits.horizonDays ?? 0,
        bodies: chart.transits.bodies.map((body) => ({
          name: body.name,
          sign: body.sign,
          longitude: body.longitude,
          nextSignIngress: body.nextSignIngress ?? null,
        })),
      }
      : undefined,
  };
}

export function answerKundliQuestion(
  chart: AssistantChart | null,
  query: string,
  language: Language,
  at = new Date(),
): AssistantAnswer {
  const normalizedQuery = normalizedQuestion(query);
  const popularQuestion = assistantQuestionCatalog.find((item) =>
    item.id === query || languages.some((candidateLanguage) =>
      normalizedQuestion(translate(candidateLanguage, `assistant.popular.${item.id}`)) === normalizedQuery,
    ),
  );
  const topic = popularQuestion?.topic ?? (Object.hasOwn(topicKeys, query) ? query as AssistantTopic : inferTopic(query));
  const promptKey = popularQuestion ? `assistant.popular.${popularQuestion.id}` : undefined;
  const followUpIds = topic ? followUps[topic] ?? [] : [];
  const answer: AssistantAnswer = {
    topic,
    status: chart ? "unsupported" : "needs-chart",
    title: localize(language, promptKey ?? (topic ? topicKeys[topic].title : "assistant.title")),
    explanation: localize(language, chart ? "assistant.unsupported" : "assistant.needsChart"),
    evidence: [],
    limitations: [],
    followUpIds,
    evidenceDisclosure: localize(language, "assistant.evidenceDisclosure"),
    disclaimer: localize(language, "assistant.disclaimer"),
    provenance: chart ? {
      chartId: chart.provenance?.resultHash ?? null,
      calculationVersion: chart.provenance?.engineVersion ?? chart.settings?.engine ?? null,
      ruleSetVersion: chart.provenance?.ruleSetVersion ?? null,
      calculatedAt: chart.provenance?.calculatedAt ?? chart.input.utc ?? null,
    } : null,
  };
  if (!chart || !topic) return answer;

  const report = interpretChart(chart, at);
  const sectionItems = (names: InterpretationCategory[]) => report.sections
    .filter((section) => names.includes(section.name))
    .flatMap((section) => section.interpretations);
  const categoryItems = (selectedTopic: AssistantTopic) => categories[selectedTopic] ? sectionItems(categories[selectedTopic]!) : [];
  const questionId = popularQuestion?.id;

  if (questionId === "marriage_limitations") {
    return {
      ...answer,
      status: "limited",
      explanation: localize(language, "assistant.limitation.marriageAnalysis"),
      evidence: [
        chart.input.birthTimeAccuracy
          ? localize(language, "assistant.evidence.birthTimeAccuracy").replace("{value}", chart.input.birthTimeAccuracy)
          : localize(language, "assistant.evidence.birthTimeAccuracyMissing"),
        chart.input.timeZone
          ? localize(language, "assistant.evidence.timeZone").replace("{value}", chart.input.timeZone)
          : localize(language, "assistant.evidence.timeZoneMissing"),
        chart.kp?.cusps?.length && chart.kp.planets?.length
          ? localize(language, "assistant.evidence.kpAvailable")
          : localize(language, "assistant.evidence.kpUnavailable"),
      ],
      limitations: [
        localize(language, "assistant.limit.marriageInterpretationReview"),
        localize(language, "assistant.limit.marriageTimingNotGuarantee"),
        localize(language, "assistant.limit.birthTimeAffectsChart"),
      ],
      followUpIds: [],
    };
  }

  if (popularQuestion?.mode === "timing" || popularQuestion?.mode === "career-timing") {
    const relevant = questionId === "business_start"
      ? sectionItems(["Business"])
      : questionId === "financial_timing"
        ? sectionItems(["Finances"])
        : questionId === "career_dasha"
          ? sectionItems(["Career", "Business"])
          : popularQuestion.category === "marriage"
            ? categoryItems("relationships")
            : sectionItems(["Career"]);
    const evidence = reportEvidence(relevant);
    evidence.push(...upcomingDashaEvidence(chart, at));
    let marriageTimingAnswer: ReturnType<typeof formatMarriageAnswer> | null = null;
    if (popularQuestion.category === "marriage" && (questionId === "marriage_timing" || questionId === "partner_timing" || questionId === "marriage_dasha")) {
      const timingChart = marriageTimingChart(chart);
      if (timingChart) {
        const timing = calculateMarriageTiming(timingChart, at);
        marriageTimingAnswer = formatMarriageAnswer(language, timing);
        if (timing.earliest_date && timing.latest_date) {
          evidence.push(`Candidate window in chart timezone: ${timing.earliest_date} – ${timing.latest_date}`);
          evidence.push(...timing.supporting_dasha_periods.slice(0, 3).map((period) => `Supporting period: ${period.mahadasha} / ${period.bhukti} / ${period.antara} (${period.start} – ${period.end})`));
        } else {
          evidence.push("No candidate window was supported by the required KP and Dasha evidence.");
        }
      }
    }
    if (popularQuestion.category === "marriage" && questionId === "marriage_dasha") {
      evidence.push(...sectionItems(["Dasha"]).map((item) => `Traditional Dasha context: ${item.reading}; factors: ${item.factors.join("; ")}`));
    }
    return {
      ...answer,
      status: "limited",
      explanation: marriageTimingAnswer?.explanation ?? questionExplanation(language, questionId, popularQuestion.category === "marriage"
        ? "assistant.limitation.marriageTiming"
        : popularQuestion.category === "government"
          ? "assistant.limitation.governmentTiming"
          : "assistant.limitation.eventTiming"),
      evidence: unique(evidence),
      limitations: [
        ...(marriageTimingAnswer?.timing ? [localize(language, "assistant.limit.marriageCandidateNotGuarantee")] : [localize(language, "assistant.limit.noEventTiming")]),
        ...(relevant.length ? [] : [localize(language, "assistant.limit.noRelevantRules")]),
      ],
      followUpIds: followUps[topic] ?? [],
      timing: marriageTimingAnswer?.timing,
    };
  }

  if (popularQuestion?.mode === "relationship") {
    const evidence = questionRuleEvidence(questionId, categoryItems("relationships"));
    if (questionId === "compatibility") {
      return {
        ...answer,
        status: "limited",
        explanation: questionExplanation(language, questionId, "assistant.limitation.compatibility"),
        evidence: unique(evidence),
        limitations: [localize(language, "assistant.limit.partnerChart"), localize(language, "assistant.limit.noEventTiming")],
      };
    }
    return {
      ...answer,
      status: "limited",
      explanation: questionExplanation(language, questionId, "assistant.limitation.relationshipIndicators"),
      evidence: unique(evidence),
      limitations: [localize(language, "assistant.limit.noPartnerDescription"), localize(language, "assistant.limit.noEventTiming")],
    };
  }

  if (popularQuestion?.mode === "career") {
    const items = questionId === "competitive_exams"
      ? sectionItems(["Education"])
      : sectionItems(["Career"]);
    const evidence = questionRuleEvidence(questionId, items);
    return {
      ...answer,
      status: items.length ? "limited" : "unavailable",
      explanation: questionExplanation(language, questionId, questionId === "career_delay" ? "assistant.limitation.careerDelay" : "assistant.limitation.careerRules"),
      evidence,
      limitations: [localize(language, "assistant.limit.noOutcomeTiming"), ...(items.length ? [] : [localize(language, "assistant.limit.noRelevantRules")])],
    };
  }

  if (popularQuestion?.mode === "comparison") {
    const targeted = questionId === "business_job_difference" || questionId === "partnership_business"
      ? [...categoryItems("business"), ...categoryItems("career")]
      : questionId === "income_savings"
        ? sectionItems(["Finances"])
      : questionId === "business_career_income"
        ? [...categoryItems("business"), ...categoryItems("career")]
        : [...categoryItems("career"), ...categoryItems("business")];
    return {
      ...answer,
      status: targeted.length ? "limited" : "unavailable",
      explanation: questionExplanation(language, questionId, questionId === "job_type_comparison"
        ? "assistant.limitation.jobTypeComparison"
        : questionId === "business_job_difference"
          ? "assistant.limitation.businessJobDifference"
          : questionId === "partnership_business"
            ? "assistant.limitation.partnershipBusiness"
            : questionId === "business_career_income"
              ? "assistant.limitation.incomeComparison"
              : questionId === "income_savings"
                ? "assistant.limitation.incomeSavings"
                : "assistant.limitation.comparison"),
      evidence: reportEvidence(targeted),
      limitations: [
        localize(language, "assistant.limit.noOutcomeTiming"),
        ...(questionId === "job_type_comparison" ? [localize(language, "assistant.limit.noEmploymentTypeRule")] : []),
        ...(questionId === "income_savings" ? [localize(language, "assistant.limit.noSeparateIncomeSavingsRule")] : []),
      ],
    };
  }

  if (popularQuestion?.mode === "property" || popularQuestion?.mode === "foreign") {
    const houses = popularQuestion.mode === "property" ? [4]
      : questionId === "foreign_settlement" ? [9, 12] : [3, 9, 12];
    const evidence = houses.flatMap((number) => {
      const cusp = chart.houses?.find((house) => house.house === number);
      const occupants = chart.planets.filter((planet) => planet.house === number);
      return [
        ...(cusp ? [`House ${number} cusp: ${cusp.sign} ${cusp.cuspLongitude.toFixed(4)}°`] : []),
        ...occupants.map((planet) => `House ${number} occupant: ${planet.name}, ${planet.sign}, house ${planet.house}`),
      ];
    });
    if (questionId === "foreign_travel_indicators") {
      evidence.unshift("Project-selected foreign-travel context: calculated houses 3, 9 and 12 and available occupants; this is descriptive chart data, not a source-reviewed outcome rule.");
    }
    if (questionId === "abroad_job_study") {
      evidence.push(...reportEvidence(sectionItems(["Career", "Education"])));
    }
    return {
      ...answer,
      status: evidence.length ? "limited" : "unavailable",
      explanation: questionExplanation(language, questionId, popularQuestion.mode === "property" ? "assistant.limitation.property" : "assistant.limitation.foreign"),
      evidence: unique(evidence),
      limitations: [localize(language, popularQuestion.mode === "property" ? "assistant.limit.noPropertyRule" : "assistant.limit.noForeignRule"), ...(evidence.length ? [] : [localize(language, "assistant.limit.noRelevantRules")])],
    };
  }

  if (popularQuestion?.mode === "strongest") {
    const interpretations = report.sections.flatMap((section) => section.interpretations);
    const multiple = interpretations.filter((item) => item.evidenceStrength === "multiple calculated factors");
    return {
      ...answer,
      status: multiple.length ? "limited" : "unavailable",
      explanation: localize(language, "assistant.limitation.strongest"),
      evidence: reportEvidence(multiple.slice(0, 6)),
      limitations: [localize(language, "assistant.limit.noStrengthRanking")],
    };
  }

  if (questionId === "financial_growth") {
    const finances = sectionItems(["Finances"]);
    return {
      ...answer,
      status: finances.length ? "limited" : "unavailable",
      explanation: localize(language, "assistant.limitation.financialGrowth"),
      evidence: reportEvidence(finances),
      limitations: [
        localize(language, "assistant.limit.noFinancialOutcomeRule"),
        ...(finances.length ? [] : [localize(language, "assistant.limit.noRelevantRules")]),
      ],
    };
  }

  if (popularQuestion?.mode === "nodes") {
    const nodes = chart.planets.filter((planet) => /node|ketu/i.test(planet.name));
    return {
      ...answer,
      status: nodes.length ? "answered" : "unavailable",
      explanation: localize(language, nodes.length ? "assistant.answer.nodes" : "assistant.unavailable"),
      evidence: nodes.map((planet) => `${planet.name}: ${planet.sign}, house ${planet.house}, ${planet.siderealLongitude.toFixed(4)}°`),
      limitations: nodes.length ? [] : [localize(language, "assistant.limit.nodesMissing")],
    };
  }

  if (popularQuestion?.mode === "long-transits") {
    const ayanamsa = chart.settings?.ayanamsa;
    if (ayanamsa !== "Lahiri" && ayanamsa !== "Raman" && ayanamsa !== "Krishnamurti") {
      return { ...answer, status: "unavailable", explanation: localize(language, "assistant.transitsUnavailable"), limitations: [localize(language, "assistant.limit.transitConvention")] };
    }
    const transitSnapshot = calculateTransits(at, { ayanamsa, horizonDays: 365.2425 });
    const oneYearLater = at.getTime() + 365.2425 * 86_400_000;
    const ingressEvidence = transitSnapshot.bodies.flatMap((body) => {
      const ingress = body.nextSignIngress;
      return ingress && Date.parse(ingress.utc) <= oneYearLater
        ? [`${body.name}: ${ingress.fromSign} → ${ingress.toSign} at ${ingress.utc} (${ingress.direction})`]
        : [];
    });
    return {
      ...answer,
      status: "limited",
      explanation: localize(language, "assistant.limitation.transitYear"),
      evidence: unique([
        `Transit snapshot: ${transitSnapshot.instantUtc}; calculated horizon: ${transitSnapshot.horizonDays} days; selected ayanamsa: ${transitSnapshot.ayanamsa}`,
        ...transitSnapshot.bodies.map((body) => `Transit ${body.name}: ${body.sign} at ${body.longitude.toFixed(4)}°`),
        ...ingressEvidence,
      ]),
      limitations: [
        localize(language, "assistant.limit.transitInterpretation"),
        ...(ingressEvidence.length ? [] : [localize(language, "assistant.limit.noIngresses")]),
      ],
    };
  }

  if (popularQuestion?.mode === "required-data") {
    const details = [
      chart.input.localDate ? `Birth date: ${chart.input.localDate}` : undefined,
      chart.input.localTime ? `Local birth time: ${chart.input.localTime}` : undefined,
      chart.input.timeZone ? `IANA timezone: ${chart.input.timeZone}` : undefined,
      chart.input.latitude !== undefined && chart.input.longitude !== undefined ? `Coordinates: ${chart.input.latitude}, ${chart.input.longitude}` : undefined,
      chart.settings?.ayanamsa ? `Ayanamsa: ${chart.settings.ayanamsa}` : undefined,
      chart.settings?.houseSystem ? `House system: ${chart.settings.houseSystem}` : undefined,
      chart.settings?.node ? `Node mode: ${chart.settings.node}` : undefined,
    ].filter((item): item is string => Boolean(item));
    return {
      ...answer,
      status: "answered",
      explanation: localize(language, "assistant.answer.requiredData"),
      evidence: details,
      limitations: [localize(language, "assistant.limit.calculationsDependOnInput")],
    };
  }

  if (categories[topic]) {
    const items = sectionItems(categories[topic]!);
    if (!items.length) {
      const unavailable = report.sections.filter((section) => categories[topic]!.includes(section.name) && !section.available);
      return {
        ...answer,
        status: "unavailable",
        explanation: localize(language, "assistant.unavailable"),
        limitations: unavailable.map((section) => section.unavailableReason).filter((reason): reason is string => Boolean(reason)),
      };
    }
    return {
      ...answer,
      status: "answered",
      explanation: localize(language, topicKeys[topic].explanation),
      evidence: questionRuleEvidence(questionId, items),
    };
  }

  if (topic === "basics") {
    const moon = chart.planets.find((planet) => planet.name === "Moon");
    return {
      ...answer,
      status: moon ? "answered" : "unavailable",
      explanation: localize(language, moon ? topicKeys.basics.explanation : "assistant.unavailable"),
      evidence: [
        `Lagna: ${chart.ascendant.sign} (${chart.ascendant.longitude.toFixed(4)}°)`,
        ...(moon ? [`Moon: ${moon.sign}${moon.nakshatra ? `; Nakshatra ${moon.nakshatra}` : ""}${moon.pada ? `, Pada ${moon.pada}` : ""}; house ${moon.house}`] : []),
      ],
      limitations: moon ? [] : [localize(language, "assistant.limit.moonMissing")],
    };
  }

  if (topic === "vargas") {
    const requested = /\bd\s*10\b|dashamsha|दशमांश/i.test(query) ? ["D10"]
      : /\bd\s*9\b|navamsa|नवांश/i.test(query) ? ["D9"] : ["D1", "D9", "D10"];
    const evidence = requested.flatMap((division) => {
      const rows = division === "D1"
        ? chart.planets.map((planet) => `${planet.name}: ${planet.sign}, house ${planet.house}`)
        : chart.divisionalCharts?.[division]?.map((item) => `${item.name}: ${item.sign}, ${item.degreesInSign.toFixed(4)}°`) ?? [];
      const convention = division === "D1"
        ? chart.settings?.houseSystem
        : chart.divisionalCharts?.[division]?.[0]?.convention;
      return rows.length
        ? [`${division} placements from this chart${convention ? `; convention: ${convention}` : ""}`, ...rows]
        : [`${division}: ${localize(language, "assistant.unavailable")}`];
    });
    if (!evidence.length) return { ...answer, status: "unavailable", explanation: localize(language, "assistant.unavailable"), evidence: [] };
    const hasPlacements = evidence.some((item) => requested.some((division) => item.startsWith(`${division} placements from this chart`)));
    return {
      ...answer,
      status: hasPlacements ? "answered" : "unavailable",
      explanation: localize(language, hasPlacements ? topicKeys.vargas.explanation : "assistant.unavailable"),
      evidence,
    };
  }

  if (topic === "dasha") {
    const maha = currentPeriod(chart.vimshottariDasha.mahadashas, at.getTime());
    const antar = maha && currentPeriod(maha.antardashas, at.getTime());
    const pratyantar = antar && currentPeriod(antar.pratyantardashas, at.getTime());
    if (!maha) return { ...answer, status: "unavailable", explanation: localize(language, "assistant.dashaUnavailable"), limitations: [localize(language, "assistant.limit.noCurrentDasha")] };
    const contextualReading = sectionItems(["Dasha"]).map((item) =>
      `Traditional Dasha context: ${item.reading}; factors: ${item.factors.join("; ")}`,
    );
    return {
      ...answer,
      status: "answered",
      explanation: localize(language, topicKeys.dasha.explanation),
      evidence: unique([
        `Mahadasha: ${maha.lord} (${maha.start} – ${maha.end})`,
        ...(antar ? [`Antardasha: ${antar.lord} (${antar.start} – ${antar.end})`] : []),
        ...(pratyantar ? [`Pratyantardasha: ${pratyantar.lord} (${pratyantar.start} – ${pratyantar.end})`] : []),
        ...contextualReading,
      ]),
    };
  }

  if (topic === "transits") {
    if (!chart.transits?.bodies.length) return { ...answer, status: "unavailable", explanation: localize(language, "assistant.transitsUnavailable") };
    return {
      ...answer,
      status: "answered",
      explanation: localize(language, topicKeys.transits.explanation),
      evidence: [`Selected transit instant: ${chart.transits.instantUtc}`, ...chart.transits.bodies.map((body) => `Transit ${body.name}: ${body.sign} at ${body.longitude.toFixed(4)}°`)],
    };
  }

  if (topic === "yogas") {
    const findings = chart.yogasAndDoshas.filter((item) => item.present);
    return {
      ...answer,
      status: "answered",
      explanation: localize(language, topicKeys.yogas.explanation),
      evidence: findings.length ? unique(findings.map((item) => `${item.category}: ${item.name}`)) : [localize(language, "assistant.noYogaMatches")],
    };
  }

  if (topic === "kp") {
    if (!chart.kp) return { ...answer, status: "unavailable", explanation: localize(language, "assistant.kpUnavailable") };
    return {
      ...answer,
      status: "answered",
      explanation: localize(language, topicKeys.kp.explanation),
      evidence: unique([
        `${chart.kp.system ?? "KP"}; ayanamsa: ${chart.kp.ayanamsa ?? "not specified"}; houses: ${chart.kp.houseSystem ?? "not specified"}`,
        ...(chart.kp.planets?.slice(0, 5).map((planet) => `${planet.name}: star lord ${planet.nakshatra.lord}, sub-lord ${planet.sub.lord}, sub-sub-lord ${planet.subSub.lord}; significator houses ${planet.significations.houses.join(", ")}`) ?? []),
        ...(chart.kp.cusps?.slice(0, 12).map((cusp) => `House ${cusp.house} cusp: sign lord ${cusp.signLord}, star lord ${cusp.nakshatra.lord}, sub-lord ${cusp.sub.lord}, sub-sub-lord ${cusp.subSub.lord}; signified by ${cusp.signifiedBy.join(", ") || "none listed"}`) ?? []),
      ]),
    };
  }

  if (topic === "panchanga") {
    if (!chart.panchanga) return { ...answer, status: "unavailable", explanation: localize(language, "assistant.panchangaUnavailable") };
    const evidence = [
      ...(chart.vara ? [`Civil weekday: ${chart.vara.civilWeekday}; sunrise-based Vara: ${chart.vara.sunriseBasedVara ?? chart.vara.status}`] : []),
      ...(chart.panchanga.tithi ? [`Tithi: ${chart.panchanga.tithi.name} (${chart.panchanga.tithi.paksha})`] : []),
      ...(chart.panchanga.nakshatra ? [`Nakshatra: ${chart.panchanga.nakshatra.name}, Pada ${chart.panchanga.nakshatra.pada}`] : []),
      ...(chart.panchanga.yoga ? [`Yoga: ${chart.panchanga.yoga}`] : []),
      ...(chart.panchanga.karana ? [`Karana: ${chart.panchanga.karana}`] : []),
      ...(chart.riseSet ? [`Sunrise: ${chart.riseSet.sunrise.localTime ?? chart.riseSet.sunrise.status}; sunset: ${chart.riseSet.sunset.localTime ?? chart.riseSet.sunset.status}`] : []),
    ];
    if (!evidence.length) return { ...answer, status: "unavailable", explanation: localize(language, "assistant.panchangaUnavailable") };
    return {
      ...answer,
      status: "answered",
      explanation: localize(language, topicKeys.panchanga.explanation),
      evidence,
    };
  }

  const interpretations = report.sections.flatMap((section) => section.interpretations);
  if (!interpretations.length) return { ...answer, status: "unavailable", explanation: localize(language, "assistant.interpretationUnavailable") };
  return {
    ...answer,
    status: "answered",
    explanation: localize(language, topicKeys.interpretation.explanation),
    evidence: unique(interpretations.slice(0, 4).map((item) => `${item.title}: ${item.matchedConditions.join("; ")}; evidence: ${item.factors.join("; ")}`)),
  };
}

export const suggestedAssistantTopics: AssistantTopic[] = [
  "basics", "career", "business", "relationships", "vargas", "dasha",
  "transits", "yogas", "kp", "panchanga", "interpretation",
];
