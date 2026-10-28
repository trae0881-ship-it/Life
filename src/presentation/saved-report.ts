export type ReportCalculationSettings = {
  ayanamsa: string;
  houseSystem: string;
  node: string;
};

export function savedReportSettingsChanged(
  savedSettings: readonly string[],
  currentSettings: ReportCalculationSettings,
): boolean | null {
  if (savedSettings.length !== 3 || savedSettings.some((value) => !value)) return null;
  return savedSettings[0] !== currentSettings.ayanamsa
    || savedSettings[1] !== currentSettings.houseSystem
    || savedSettings[2] !== currentSettings.node;
}
