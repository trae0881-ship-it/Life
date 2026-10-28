import type { PlaceMatch, PlaceSearchResult } from "../server/location-search.ts";

function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function isPlaceMatch(value: unknown): value is PlaceMatch {
  if (!value || typeof value !== "object") return false;
  const place = value as Record<string, unknown>;
  return typeof place.id === "string" && Boolean(place.id) &&
    typeof place.name === "string" && Boolean(place.name) &&
    typeof place.admin1 === "string" &&
    typeof place.countryCode === "string" && typeof place.countryName === "string" &&
    typeof place.latitude === "number" && Number.isFinite(place.latitude) && place.latitude >= -90 && place.latitude <= 90 &&
    typeof place.longitude === "number" && Number.isFinite(place.longitude) && place.longitude >= -180 && place.longitude <= 180 &&
    isValidTimeZone(place.timeZone) &&
    typeof place.population === "number" && Number.isSafeInteger(place.population) && place.population >= 0;
}

export async function readPlaceSearchResponse(response: Pick<Response, "ok" | "json">): Promise<PlaceSearchResult> {
  if (!response.ok) throw new Error("Place search request failed.");
  const result: unknown = await response.json();
  if (!result || typeof result !== "object") throw new Error("Place search response was invalid.");
  const payload = result as Record<string, unknown>;
  const matches = payload.matches;
  const totalMatches = payload.totalMatches;
  const ambiguous = payload.ambiguous;
  if (!Array.isArray(matches) || !matches.every(isPlaceMatch) ||
    typeof totalMatches !== "number" || !Number.isSafeInteger(totalMatches) || totalMatches < matches.length ||
    typeof ambiguous !== "boolean" || ambiguous !== (totalMatches > 1)) {
    throw new Error("Place search response was invalid.");
  }
  return { matches, totalMatches, ambiguous };
}
