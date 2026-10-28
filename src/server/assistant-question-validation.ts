export type ProfileBirthData = {
  localDate: string;
  localTime: string | null;
  timeZone: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function chartMatchesBirthProfile(
  chartInput: Partial<ProfileBirthData> | null | undefined,
  profile: ProfileBirthData,
) {
  if (!chartInput) return false;
  return chartInput.localDate === profile.localDate
    && chartInput.localTime === profile.localTime
    && chartInput.timeZone === profile.timeZone
    && chartInput.latitude === profile.latitude
    && chartInput.longitude === profile.longitude;
}
