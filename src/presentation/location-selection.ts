import type { PlaceMatch } from "../server/location-search.ts";

export function birthplaceFormFields(place: PlaceMatch) {
  return {
    birthPlace: [place.name, place.admin1, place.countryName].filter(Boolean).join(", "),
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    timeZone: place.timeZone,
    coordinateSource: "gazetteer",
  };
}

export function manualLocationEditSource(source: string) {
  return source === "gazetteer" ? "manual-unknown" : source;
}
