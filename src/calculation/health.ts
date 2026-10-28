import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

type Manifest = {
  packageVersion: string;
  assets: { filename: string; sha256: string }[];
};

export async function engineHealth() {
  const manifestPath = path.join(process.cwd(), "data", "ephemeris-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  const files = await Promise.all(manifest.assets.map(async (asset) => {
    try {
      const bytes = await readFile(path.join(process.cwd(), "data", "ephemeris", asset.filename));
      const actual = createHash("sha256").update(bytes).digest("hex").toUpperCase();
      return { filename: asset.filename, present: true, checksumValid: actual === asset.sha256 };
    } catch {
      return { filename: asset.filename, present: false, checksumValid: false };
    }
  }));
  const required = files.filter(({ filename }) => filename === "sepl_18.se1" || filename === "semo_18.se1");
  const requiredReady = required.length === 2 && required.every((file) => file.present && file.checksumValid);
  let nativeBinding = "not-loaded";
  try {
    await import("@swisseph/node");
    nativeBinding = "loaded";
  } catch {
    nativeBinding = "load-failed";
  }
  const ready = requiredReady && nativeBinding === "loaded";
  return {
    ready,
    engine: "@swisseph/node",
    engineVersion: manifest.packageVersion,
    license: "AGPL-3.0",
    nativeBinding,
    ephemerisFiles: files,
    requiredAssetsReady: requiredReady,
    supportedDateRange: "Sampled: the 15th of January, June, and December in 1801, 1802, 2398, and 2399 for all 12 bodies. Exact edges and continuity are not independently established; every calculation rejects a Swiss Ephemeris fallback.",
    timezoneDatabaseVersion: process.versions.tz ?? "unknown",
    outboundCalculationServices: "none",
  };
}
