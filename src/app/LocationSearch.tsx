"use client";

import { useEffect, useMemo, useState } from "react";
import { translate, type Language } from "@/presentation/language";
import { readPlaceSearchResponse } from "@/presentation/location-search";
import type { PlaceMatch } from "@/server/location-search";
import "./location-search.css";

type Props = {
  language: Language;
  onSelect: (place: PlaceMatch) => void;
  selectionVersion: number;
};

const copy: Record<Language, Record<string, string>> = {
  en: {
    placeholder: "Search a city or populated place",
    hint: "Choose a result to fill the birthplace, coordinates and timezone. Search uses the bundled GeoNames populated-places dataset; smaller localities may be absent.",
    loading: "Searching places…",
    empty: "No matching places. Try a nearby larger city, or enter verified location details manually.",
    error: "Place search is unavailable. You can enter verified location details manually.",
    results: "Matching places",
    ambiguous: "Several places match. Choose the correct region and country.",
    selected: "Selected place:",
  },
  hi: {
    placeholder: "शहर या आबादी वाला स्थान खोजें",
    hint: "जन्मस्थान, निर्देशांक और समय क्षेत्र भरने के लिए परिणाम चुनें। खोज में GeoNames के शामिल आबादी वाले स्थानों का स्थानीय डेटासेट है; छोटे स्थान उपलब्ध न भी हों।",
    loading: "स्थान खोजे जा रहे हैं…",
    empty: "कोई मेल नहीं मिला। पास का बड़ा शहर खोजें या सत्यापित स्थान विवरण स्वयं भरें।",
    error: "स्थान खोज उपलब्ध नहीं है। सत्यापित स्थान विवरण स्वयं भर सकते हैं।",
    results: "मेल खाते स्थान",
    ambiguous: "कई स्थान मेल खाते हैं। सही क्षेत्र और देश चुनें।",
    selected: "चुना गया स्थान:",
  },
  hinglish: {
    placeholder: "City ya populated place search karein",
    hint: "Birthplace, coordinates aur timezone fill karne ke liye result select karein. Search bundled GeoNames populated-places dataset use karta hai; chhoti localities list mein na hon.",
    loading: "Places search ho rahe hain…",
    empty: "Koi matching place nahi mila. Paas ka bada city search karein ya verified location details manually bharein.",
    error: "Place search available nahi hai. Verified location details manually bhar sakte hain.",
    results: "Matching places",
    ambiguous: "Kai places match hue hain. Sahi region aur country select karein.",
    selected: "Selected place:",
  },
};

export default function LocationSearch({ language, onSelect, selectionVersion }: Props) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<PlaceMatch[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<PlaceMatch | null>(null);
  const text = copy[language];
  const label = translate(language, "form.locationSearch");
  const countryNames = useMemo(() => new Intl.DisplayNames([language === "hi" ? "hi" : "en"], { type: "region" }), [language]);

  useEffect(() => {
    setSelected(null);
  }, [selectionVersion]);

  useEffect(() => {
    const normalized = query.trim();
    setMatches([]);
    setTotalMatches(0);
    setFailed(false);
    if (normalized.length < 2) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/locations?q=${encodeURIComponent(normalized)}`, { signal: controller.signal, cache: "no-store" });
        const result = await readPlaceSearchResponse(response);
        setMatches(result.matches);
        setTotalMatches(result.totalMatches);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function selectPlace(place: PlaceMatch) {
    setSelected(place);
    setQuery("");
    setMatches([]);
    setTotalMatches(0);
    onSelect(place);
  }

  function formatPlace(place: PlaceMatch) {
    const region = place.admin1 && place.admin1 !== place.name ? `${place.admin1}, ` : "";
    return `${place.name}, ${region}${countryNames.of(place.countryCode) ?? place.countryCode}`;
  }

  return (
    <div className="location-search">
      <label className="field-label" htmlFor="birthplace-search">
        {label}
        <input
          id="birthplace-search"
          type="search"
          minLength={2}
          maxLength={80}
          autoComplete="off"
          value={query}
          placeholder={text.placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={matches.length > 0}
          aria-controls="birthplace-results"
          aria-describedby="birthplace-search-hint birthplace-search-status"
          onChange={(event) => {
            setSelected(null);
            setQuery(event.target.value);
          }}
        />
      </label>
      <small id="birthplace-search-hint" className="field-hint">{text.hint}</small>
      <a className="location-search-source" href="/references#geonames-cities500">Dataset source and attribution: GeoNames</a>
      <div id="birthplace-search-status" className="location-search-status" aria-live="polite" role="status">
        {loading && text.loading}
        {!loading && failed && <span role="alert">{text.error}</span>}
        {!loading && !failed && query.trim().length >= 2 && matches.length === 0 && text.empty}
        {selected && <span>{text.selected} {formatPlace(selected)}</span>}
      </div>
      {matches.length > 0 && (
        <div className="location-search-results">
          <p>{totalMatches > 1 ? text.ambiguous : text.results}</p>
          <ul id="birthplace-results" role="listbox" aria-label={text.results}>
            {matches.map((place) => (
              <li key={place.id} role="none">
                <button type="button" role="option" aria-selected="false" onClick={() => selectPlace(place)}>{formatPlace(place)}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
