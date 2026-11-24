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

function readPalmReadings(): SavedPalmReading[] {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch {
    throw new Error("Your saved Palmistry history is unreadable. Clear its local history data before saving again.");
  }
  if (!Array.isArray(parsed) || parsed.length > MAX_SAVED_PALM_READINGS || parsed.some((item) =>
    !item || typeof item !== "object"
      || typeof item.id !== "string"
      || typeof item.title !== "string"
      || (item.side !== "left" && item.side !== "right")
      || typeof item.createdAt !== "string"
      || !item.observations || typeof item.observations !== "object"
      || !item.report || !Array.isArray(item.report.sections)
      || (item.imageDataUrl !== null && typeof item.imageDataUrl !== "string"))) {
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
