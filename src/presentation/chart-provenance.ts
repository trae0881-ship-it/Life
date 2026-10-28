export type ChartProvenance = {
  resultHash: string;
  engineVersion: string;
  ruleSetVersion?: string;
  calculatedAt?: string;
  status: string;
};

export type ProvenancedChart = {
  input?: { utc?: string; timeZone?: string };
  settings?: { engine?: string; ruleSetVersion?: string };
  provenance?: ChartProvenance;
};

export function hasUsableChartProvenance(chart: null): false;
export function hasUsableChartProvenance<T extends object>(chart: T | null): chart is T & { provenance: ChartProvenance };
export function hasUsableChartProvenance(chart: unknown): chart is ProvenancedChart & { provenance: ChartProvenance } {
  if (!chart || typeof chart !== "object") return false;
  const value = chart as ProvenancedChart;
  return value.provenance?.status === "calculated"
    && typeof value.provenance.resultHash === "string"
    && value.provenance.resultHash.length > 0
    && typeof value.provenance.engineVersion === "string"
    && typeof value.input?.utc === "string"
    && typeof value.input.timeZone === "string";
}

export function chartProvenanceRecord(chart: ProvenancedChart) {
  return {
    chartId: chart.provenance?.resultHash ?? null,
    calculationVersion: chart.provenance?.engineVersion ?? chart.settings?.engine ?? null,
    ruleSetVersion: chart.provenance?.ruleSetVersion ?? chart.settings?.ruleSetVersion ?? null,
    calculatedAt: chart.provenance?.calculatedAt ?? chart.input?.utc ?? null,
  };
}
