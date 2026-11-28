import { isDeepStrictEqual } from "node:util";
import {
  calculateCheiroBirthNumber,
  calculateCheiroNameNumber,
  CHEIRO_REVISED_METHOD_ID,
} from "../calculation/cheiro-revised.ts";

export const ASTROLOGY_READING_SERVICES = ["palmistry", "ank-jyotish", "tarot"] as const;
export type AstrologyReadingService = (typeof ASTROLOGY_READING_SERVICES)[number];

function getValidatedBirthDay(value: string): number | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const dmy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!iso && !dmy) return null;

  const year = iso ? Number(iso[1]) : Number(dmy![3]);
  const month = iso ? Number(iso[2]) : Number(dmy![2]);
  const day = iso ? Number(iso[3]) : Number(dmy![1]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1800 || year > 2399
    || date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day) return null;
  return day;
}

function validateCheiroPayload(payload: Record<string, unknown>, title: string): Record<string, unknown> | null {
  if (payload.readingType !== "cheiro-revised-report"
    || payload.methodId !== CHEIRO_REVISED_METHOD_ID
    || payload.methodVersion !== 1
    || typeof payload.originalName !== "string"
    || typeof payload.dateOfBirth !== "string") return null;

  const dayOfMonth = getValidatedBirthDay(payload.dateOfBirth);
  if (dayOfMonth === null) return null;

  try {
    const nameResult = calculateCheiroNameNumber(payload.originalName);
    const birthNumber = calculateCheiroBirthNumber(dayOfMonth);
    if (payload.sourceEdition !== nameResult.sourceEdition
      || payload.copyrightYear !== nameResult.copyrightYear
      || payload.printingYear !== nameResult.printingYear
      || !isDeepStrictEqual(payload.words, nameResult.words)
      || payload.compoundNameNumber !== nameResult.compoundNameNumber
      || payload.nameRoot !== nameResult.nameRoot
      || !isDeepStrictEqual(payload.birthNumber, birthNumber)) return null;

    return {
      readingType: "cheiro-revised-report",
      title,
      ...nameResult,
      originalName: payload.originalName,
      dateOfBirth: payload.dateOfBirth,
      birthNumber,
    };
  } catch {
    return null;
  }
}

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
  if (record.service === "ank-jyotish") {
    if (typeof payload.dateOfBirth === "string") {
      if (getValidatedBirthDay(payload.dateOfBirth) === null) return null;
    }
  }
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
  let validatedPayload: Record<string, unknown> = payload;
  if (record.service === "ank-jyotish"
    && (Object.hasOwn(payload, "methodId")
      || Object.hasOwn(payload, "methodVersion")
      || payload.readingType === "cheiro-revised-report")) {
    const cheiroPayload = validateCheiroPayload(payload, record.title.trim());
    if (!cheiroPayload) return null;
    validatedPayload = cheiroPayload;
  }
  return { service: record.service, title: record.title.trim(), payload: validatedPayload };
}

export function parseAstrologyReadingService(value: string | null): AstrologyReadingService | null {
  if (value === null) return null;
  return isAstrologyReadingService(value) ? value : null;
}
