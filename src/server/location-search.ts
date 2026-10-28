import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";

export type PlaceMatch = {
  id: string;
  name: string;
  admin1: string;
  countryCode: string;
  countryName: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  population: number;
};

export type PlaceSearchResult = {
  matches: PlaceMatch[];
  totalMatches: number;
  ambiguous: boolean;
};

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const countryNameCache = new Map<string, string>();
const timeZoneValidity = new Map<string, boolean>();

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function locationSearchPrefix(rawQuery: string) {
  const normalized = normalize(rawQuery);
  if (normalized.length < 2 || normalized.length > 80) return null;
  return Array.from(normalized.split(" ")[0]).slice(0, 2).join("");
}

function isValidTimeZone(value: string) {
  const cached = timeZoneValidity.get(value);
  if (cached !== undefined) return cached;
  let valid = true;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
  } catch {
    valid = false;
  }
  timeZoneValidity.set(value, valid);
  return valid;
}

type ParsedPlace = Omit<PlaceMatch, "countryName"> & { asciiName: string };

function parsePlace(line: string): ParsedPlace | null {
  const fields = line.split("\t");
  if (fields.length !== 9) return null;
  const [id, name, asciiName, latitudeText, longitudeText, countryCode, admin1, populationText, timeZone] = fields;
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);
  const population = Number(populationText);
  if (!id || !name || !countryCode || !timeZone ||
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
    !Number.isSafeInteger(population) || population < 0) return null;
  return { id, name, asciiName, admin1, countryCode, latitude, longitude, timeZone, population };
}

function countryName(countryCode: string) {
  const cached = countryNameCache.get(countryCode);
  if (cached) return cached;
  const name = countryNames.of(countryCode);
  if (name) countryNameCache.set(countryCode, name);
  return name ?? "";
}

function rank(place: ParsedPlace, query: string, terms: string[]) {
  const name = normalize(place.name);
  const asciiAndRegion = normalize(`${place.name} ${place.asciiName} ${place.admin1} ${countryName(place.countryCode)} ${place.countryCode}`);
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.includes(query)) return 2;
  if (terms.every((term) => asciiAndRegion.includes(term))) return 3;
  return null;
}

export async function* readLocationLines(filePath: string): AsyncGenerator<string> {
  const stream = createReadStream(filePath).pipe(createGunzip());
  let remainder = "";
  for await (const bytes of stream) {
    const parts = (remainder + bytes.toString("utf8")).split(/\r?\n/);
    remainder = parts.pop() ?? "";
    yield* parts;
  }
  if (remainder) yield remainder;
}

export async function searchLocations(lines: AsyncIterable<string> | Iterable<string>, rawQuery: string, limit = 10): Promise<PlaceSearchResult> {
  const query = normalize(rawQuery);
  if (query.length < 2 || query.length > 80) throw new RangeError("Place search query must contain 2 to 80 normalized characters.");
  const terms = query.split(" ");
  const matches: Array<{ place: PlaceMatch; rank: number }> = [];
  const seenPlaces = new Set<string>();
  let totalMatches = 0;

  for await (const line of lines) {
    const parsed = parsePlace(line);
    if (!parsed || seenPlaces.has(parsed.id)) continue;
    const matchRank = rank(parsed, query, terms);
    if (matchRank === null) continue;
    if (!countryName(parsed.countryCode) || !isValidTimeZone(parsed.timeZone)) continue;
    seenPlaces.add(parsed.id);
    const { asciiName: _asciiName, ...placeData } = parsed;
    const place: PlaceMatch = { ...placeData, countryName: countryName(parsed.countryCode) };
    totalMatches += 1;
    matches.push({ place, rank: matchRank });
    matches.sort((a, b) => a.rank - b.rank || b.place.population - a.place.population || a.place.name.localeCompare(b.place.name));
    if (matches.length > limit) matches.pop();
  }

  const selected = matches.map(({ place }) => place);
  return { matches: selected, totalMatches, ambiguous: totalMatches > 1 };
}
