const reportSectionTopics = {
  overview: "basics",
  personality: "basics",
  nakshatra: "basics",
  "birth-chart": "basics",
  "chandra-kundli": "basics",
  "bhava-chalit": "basics",
  "planetary-positions": "basics",
  "planetary-aspects": "interpretation",
  career: "career",
  education: "career",
  business: "business",
  finances: "business",
  relationships: "relationships",
  marriage: "relationships",
  family: "relationships",
  health: undefined,
  property: undefined,
  "foreign-travel": undefined,
  panchanga: "panchanga",
  dasha: "dasha",
  transits: "transits",
  "rise-set": "panchanga",
  "planetary-rules": "interpretation",
  rules: "yogas",
  kp: "kp",
  predictions: "interpretation",
} as const;

export type AssistantReportSection = keyof typeof reportSectionTopics | `D${number}`;
export type AssistantReportTopic = Exclude<(typeof reportSectionTopics)[keyof typeof reportSectionTopics], undefined> | "vargas";

export function isAssistantReportSection(value: unknown): value is AssistantReportSection {
  if (typeof value !== "string") return false;
  if (Object.hasOwn(reportSectionTopics, value)) return true;
  const division = /^D([1-9]|[1-5]\d|60)$/.exec(value);
  return Boolean(division);
}

export function assistantTopicForSection(section: AssistantReportSection | undefined): AssistantReportTopic | undefined {
  if (!section) return undefined;
  if (/^D([1-9]|[1-5]\d|60)$/.test(section)) return "vargas";
  return reportSectionTopics[section as keyof typeof reportSectionTopics];
}

export function divisionalSection(section: AssistantReportSection | undefined): string | undefined {
  return section && /^D([1-9]|[1-5]\d|60)$/.test(section) ? section : undefined;
}
