import type { PalmObservations, PalmReport, PalmSide } from "./engine";

export const MAX_SAVED_PALM_READINGS = 50;
const STORAGE_KEY = "life-palmistry-readings";

export type SavedPalmReading = {
  id: string;
  title: string;
  side: PalmSide;
  createdAt: string;
  observations: PalmObservations;
  report: PalmReport;
  imageDataUrl: string | null;
};

function isSavedPalmReading(item: unknown): item is SavedPalmReading {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  const record = item as Record<string, unknown>;
  const report = record.report;
  return typeof record.id === "string"
    && typeof record.title === "string"
    && (record.side === "left" || record.side === "right")
    && typeof record.createdAt === "string"
    && Boolean(record.observations && typeof record.observations === "object" && !Array.isArray(record.observations))
    && Boolean(report && typeof report === "object" && !Array.isArray(report) && Array.isArray((report as Record<string, unknown>).sections))
    && (record.imageDataUrl === null || typeof record.imageDataUrl === "string");
}

function readPalmReadings(): SavedPalmReading[] {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch {
    throw new Error("Your saved Palmistry history is unreadable. Clear its local history data before saving again.");
  }
  if (!Array.isArray(parsed) || parsed.length > MAX_SAVED_PALM_READINGS || parsed.some((item) => !isSavedPalmReading(item))) {
    throw new Error("Your saved Palmistry history contains invalid data.");
  }
  return parsed as SavedPalmReading[];
}

export async function listPalmReadings(): Promise<SavedPalmReading[]> {
  return readPalmReadings();
}

export async function savePalmReading(reading: SavedPalmReading): Promise<void> {
  const readings = readPalmReadings().filter((item) => item.id !== reading.id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([reading, ...readings].slice(0, MAX_SAVED_PALM_READINGS)));
}

export async function deletePalmReading(id: string): Promise<void> {
  const readings = readPalmReadings();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readings.filter((item) => item.id !== id)));
}
