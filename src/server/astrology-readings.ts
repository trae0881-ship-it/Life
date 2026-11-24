export const ASTROLOGY_READING_SERVICES = ["palmistry", "ank-jyotish", "tarot"] as const;
export type AstrologyReadingService = (typeof ASTROLOGY_READING_SERVICES)[number];

export function isAstrologyReadingService(value: unknown): value is AstrologyReadingService {
  return typeof value === "string" && ASTROLOGY_READING_SERVICES.some((service) => service === value);
}

export function validateAstrologyReadingInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!isAstrologyReadingService(record.service)) return null;
  if (typeof record.title !== "string" || record.title.trim().length === 0 || record.title.trim().length > 120) return null;
  if (!record.payload || typeof record.payload !== "object" || Array.isArray(record.payload)) return null;
  const payload = record.payload as Record<string, unknown>;
  if (record.service === "palmistry" && payload.imageDataUrl !== null
    && (typeof payload.imageDataUrl !== "string"
      || !/^data:image\/(?:jpeg|png|webp);base64,/.test(payload.imageDataUrl)
      || payload.imageDataUrl.length > 4_200_000)) return null;
  let serialized: string;
  try {
    serialized = JSON.stringify(record.payload);
  } catch {
    return null;
  }
  if (serialized.length > 4_500_000) return null;
  return { service: record.service, title: record.title.trim(), payload: record.payload };
}

export function parseAstrologyReadingService(value: string | null): AstrologyReadingService | null {
  if (value === null) return null;
  return isAstrologyReadingService(value) ? value : null;
}
