type BirthSnapshot = {
  localDate?: unknown;
  localTime?: unknown;
  timeZone?: unknown;
  latitude?: unknown;
  longitude?: unknown;
};

type ReportData = {
  inputSnapshot: unknown;
  result: unknown;
  profile: ({ label: string } & BirthSnapshot) | null;
};

export type SavedReportSummary = {
  profileLabel: string | null;
  birthDate: string | null;
  calculationStatus: "saved-snapshot" | "profile-changed";
  availableSections: string[];
  calculationConvention: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function profileMatchesSnapshot(snapshot: BirthSnapshot, profile: BirthSnapshot): boolean {
  return snapshot.localDate === profile.localDate
    && snapshot.localTime === profile.localTime
    && snapshot.timeZone === profile.timeZone
    && snapshot.latitude === profile.latitude
    && snapshot.longitude === profile.longitude;
}

function availableSections(result: Record<string, unknown>): string[] {
  const sections: string[] = [];
  if (Array.isArray(result.planets) && result.planets.length > 0) sections.push("kundli");
  if (isRecord(result.vimshottariDasha) && Array.isArray(result.vimshottariDasha.mahadashas)) sections.push("dasha");
  if (isRecord(result.divisionalCharts)) sections.push("divisionalCharts");
  if (isRecord(result.transits)) sections.push("transits");
  if (isRecord(result.panchanga)) sections.push("panchanga");
  if (isRecord(result.kp)) sections.push("kp");
  return sections;
}

function calculationConvention(result: Record<string, unknown>): string[] {
  const settings = result.settings;
  if (!isRecord(settings)) return [];
  return ["ayanamsa", "houseSystem", "node"]
    .map((key) => settings[key])
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

export function savedReportSummary(data: ReportData): SavedReportSummary {
  const snapshot = isRecord(data.inputSnapshot) ? data.inputSnapshot : {};
  const result = isRecord(data.result) ? data.result : {};
  const profileChanged = data.profile !== null && !profileMatchesSnapshot(snapshot, data.profile);
  return {
    profileLabel: data.profile?.label ?? null,
    birthDate: typeof snapshot.localDate === "string" ? snapshot.localDate : null,
    calculationStatus: profileChanged ? "profile-changed" : "saved-snapshot",
    availableSections: availableSections(result),
    calculationConvention: calculationConvention(result),
  };
}
