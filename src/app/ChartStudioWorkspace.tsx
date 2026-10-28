"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import AccountPanel from "./AccountPanel";
import KundliDetails from "./KundliDetails";
import KundliChart from "./KundliChart";
import DivisionalChartSections from "./DivisionalChartSections";
import InterpretationPanel from "./InterpretationPanel";
import KundliAssistant from "./KundliAssistant";
import AstrologyFaq from "./AstrologyFaq";
import LocationSearch from "./LocationSearch";
import ReferenceLinks from "./ReferenceLinks";
import type { PlaceMatch } from "@/server/location-search";
import { birthFormValues, canSubmitBirthForm, hasChartCalculationInputs, validateBirthForm, type BirthFormField, type BirthFormValidation, type BirthFormValues } from "@/presentation/birth-form";
import { isLanguage, translate, type Language } from "@/presentation/language";
import { readLanguagePreference, writeLanguagePreference } from "@/presentation/language-preference";
import { resultCopy } from "@/presentation/result-copy";
import { birthplaceFormFields, manualLocationEditSource } from "@/presentation/location-selection";
import { currentDashaSummary } from "@/calculation/dasha-summary";
import { analysisReadiness } from "@/calculation/analysis-readiness";
import { isValidDateOnly } from "@/calculation/date-only";
import PlanetaryStatusPanel from "./PlanetaryStatusPanel";
import HouseAnalysisSections from "./HouseAnalysisSections";
import "./kundli.css";
import "./responsive.css";
import "./typography.css";

type Chart = {
  input: { fullName: string | null; birthPlace: string | null; coordinateSource: string; birthTimeAccuracy: string; localDate: string; localTime: string; timeZone: string; resolvedOffset: string; utc: string; julianDayUt: number; julianDayUtc: number; julianDayUtInputScale: string; latitude: number; longitude: number };
  settings: { engine: string; bindingVersion: string; runtimeVersion: string; swissEphemerisLibraryVersion: string; ephemerisManifestVersion: number; timezoneDatabaseVersion: string; timeScaleConvention: string; ayanamsa: string; houseSystem: string; node: string; flags: number; tropicalFlags: number; coordinateConvention: string; ruleSetVersion: string; npmTarballIntegrity: string; ephemerisAssets: { filename: string; sha256: string }[] };
  ayanamsa: number;
  ascendant: { sign: string; degrees: number; minutes: number; seconds: number; longitude: number };
  mc: { sign: string; degrees: number; minutes: number; seconds: number; longitude: number };
  houses: { house: number; sign: string; cuspLongitude: number }[];
  planets: { name: string; longitude: number; tropicalLongitude: number; siderealLongitude: number; sign: string; degrees: number; minutes: number; seconds: number; nakshatra: string; pada: number; motion: string; house: number; latitude: number; longitudeSpeed: number }[];
  divisionalCharts: Record<string, { name: string; division: string; convention: string; segment: number; sign: string; longitude: number; degreesInSign: number }[]>;
  vimshottariDasha: { birthMoon: { nakshatra: string }; startingMahadasha: string; remainingMahadashaBalanceYears: number; convention: { yearDays: number }; mahadashas: { lord: string; start: string; end: string; runningAtBirth: boolean; antardashas: { lord: string; start: string; end: string; runningAtBirth: boolean; pratyantardashas: { lord: string; start: string; end: string; runningAtBirth: boolean }[] }[] }[] };
  panchanga: { weekday: string; nakshatra: { name: string; index: number; pada: number; longitude: number }; tithi: { name: string; number: number; paksha: string; elongationDegrees: number }; karana: string; yoga: string; convention: string };
  riseSet: RiseSet;
  vara: Vara;
  transits: Transits;
  planetaryDignity: Dignity[];
  planetaryAspects: Aspects;
  yogasAndDoshas: YogaFinding[];
  kp: Kp | null;
  provenance: { resultHash: string; timezoneDatabaseVersion: string; engineVersion: string; status: string; fullyVerified: boolean; independentReferenceValidation: string; limitations: string[] };
};
type RiseSetEvent = { event: string; status: "calculated" | "no-event"; utc: string | null; localTime: string | null; julianDayUt: number | null; eventLocalDate: string | null; occursOnReferenceDate: boolean | null; reason: string | null };
type RiseSet = { referenceDate: string; timeZone: string; latitude: number; longitude: number; sunrise: RiseSetEvent; sunset: RiseSetEvent; moonrise: RiseSetEvent; moonset: RiseSetEvent; convention: string; library: string };
type Vara = { civilWeekday: string; sunriseBasedVara: string | null; status: "calculated" | "unavailable"; sunriseUtc: string | null; sunriseLocalTime: string | null; rule: string; reason: string | null };
type TransitBody = { name: string; longitude: number; sign: string; signIndex: number; nakshatra: string; pada: number; nextSignIngress: { utc: string; fromSign: string; toSign: string; direction: string; refinementDays: number } | null };
type Transits = { instantUtc: string; ayanamsa: string; horizonDays: number; bodies: TransitBody[]; method: string; limitations: string[] };
type Dignity = { name: string; sign: string; signIndex: number; degreesInSign: number; signLord: string; dignity: string; combust: boolean | null; retrograde: boolean | null };
type Aspects = { convention: string; details: { name: string; house: number; aspectsHouses: number[]; aspectsPlanets: string[] }[] };
type YogaFinding = { id: string; name: string; category: "yoga" | "dosha"; present: boolean; rule: string; planets: string[]; detail?: string };
type KpChain = { longitude: number; sign: string; signIndex: number; signLord: string; nakshatra: { name: string; index: number; lord: string; pada: number; startDegrees: number; spanDegrees: number }; sub: { lord: string; index: number; startDegrees: number; spanDegrees: number }; subSub: { lord: string; index: number; startDegrees: number; spanDegrees: number } };
type KpPlanet = KpChain & { name: string; house: number; significations: { occupied: number[]; owned: number[]; starLordOccupied: number[]; starLordOwned: number[]; dispositorOccupied: number[]; dispositorOwned: number[]; houses: number[] } };
type KpCusp = KpChain & { house: number; signifiedBy: string[] };
type Kp = { system: string; ayanamsa: string; houseSystem: string; ayanamsaValue: number; convention: Record<string, string>; planets: KpPlanet[]; cusps: KpCusp[] };
type Sensitivity = {
  settings: { windowMinutes: number; stepMinutes: number; ayanamsa: string; houseSystem: string; nodeMode: string };
  sampleCount: number;
  changes: { label: string; stable: boolean; outcomes: string[]; transitions: { fromMinute: number; toMinute: number; before: string; after: string }[] }[];
  lagnaRange: { minimumLongitude: number; maximumLongitude: number; spanDegrees: number; signs: string[] };
  limitations: string[];
};

const houseShort: Record<string, string> = { Sun: "Su", Moon: "Mo", Mercury: "Me", Venus: "Ve", Mars: "Ma", Jupiter: "Ju", Saturn: "Sa", Uranus: "Ur", Neptune: "Ne", Pluto: "Pl", "Mean node": "Rm", "True node": "Rt", "Mean Ketu": "Km", "True Ketu": "Kt" };

export default function ChartStudioWorkspace() {
  const [chart, setChart] = useState<Chart | null>(null);
  const [error, setError] = useState<{ messageKey: string; code?: string; details?: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [engine, setEngine] = useState<"checking" | "ready" | "offline">("checking");
  const [selectedOffset, setSelectedOffset] = useState("");
  const [selectedTransits, setSelectedTransits] = useState<Transits | null>(null);
  const [profileDraft, setProfileDraft] = useState<BirthFormValues>({ timeKnown: false });
  const [sensitivity, setSensitivity] = useState<Sensitivity | null>(null);
  const [sensitivityWindow, setSensitivityWindow] = useState<2 | 5 | 15>(5);
  const [sensitivityBusy, setSensitivityBusy] = useState(false);
  const [sensitivityError, setSensitivityError] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [formValidation, setFormValidation] = useState<BirthFormValidation>({ valid: false, field: "localDate", messageKey: "validation.date" });
  const [formIsValid, setFormIsValid] = useState(false);
  const [showFormValidation, setShowFormValidation] = useState(false);
  const [locationSelectionVersion, setLocationSelectionVersion] = useState(0);
  const [planetSearch, setPlanetSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const birthForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then(async (response) => {
        const health = await response.json() as { engineReady?: unknown };
        setEngine(health.engineReady === true ? "ready" : "offline");
      })
      .catch(() => setEngine("offline"));
    setLanguage(readLanguagePreference(window.localStorage));
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "hi" ? "hi" : language === "hinglish" ? "hi-Latn" : "en";
  }, [language]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        window.setTimeout(() => menuToggle.current?.focus({ preventScroll: true }), 0);
      }
    };
    const openAccountNavigation = () => setMenuOpen(true);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("life-open-account", openAccountNavigation);
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("life-open-account", openAccountNavigation);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function selectLanguage(value: string) {
    if (!isLanguage(value)) return;
    setLanguage(value);
    writeLanguagePreference(window.localStorage, value);
  }

  function closeMobileMenu() {
    setMenuOpen(false);
    window.setTimeout(() => menuToggle.current?.focus({ preventScroll: true }), 0);
  }

  function refreshFormValidation() {
    const form = birthForm.current;
    if (!form) return;
    const values = birthFormValues(form);
    setProfileDraft(values);
    const result = validateBirthForm(values);
    setFormValidation(result);
    setFormIsValid(result.valid);
  }

  function messageForField(field: BirthFormField) {
    return showFormValidation && !formValidation.valid && formValidation.field === field
      ? translate(language, formValidation.messageKey)
      : "";
  }

  function selectBirthplace(place: PlaceMatch) {
    const form = birthForm.current;
    if (!form) return;
    for (const [name, value] of Object.entries(birthplaceFormFields(place))) {
      const field = form.elements.namedItem(name);
      if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) field.value = value;
    }
    setSelectedOffset("");
    const sourceField = form.elements.namedItem("coordinateSource");
    if (sourceField instanceof HTMLSelectElement) sourceField.dispatchEvent(new Event("input", { bubbles: true }));
  }

  async function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const values = birthFormValues(formElement);
    const validation = validateBirthForm(values);
    setFormValidation(validation);
    setFormIsValid(validation.valid);
    setShowFormValidation(true);
    if (!validation.valid) {
      return;
    }
    if (!hasChartCalculationInputs(values)) {
      setError({ messageKey: "form.chartNeedsDetails" });
      return;
    }
    if (engine !== "ready") {
      setError({ messageKey: engine === "checking" ? "form.engineChecking" : "form.engineOffline" });
      return;
    }
    setBusy(true);
    setError(null);
    setChart(null);
    window.sessionStorage.removeItem("life-current-chart");
    setSelectedTransits(null);
    setSensitivity(null);
    const form = new FormData(formElement);
    const payload = {
      fullName: String(form.get("fullName") ?? ""),
      birthPlace: String(form.get("birthPlace") ?? ""),
      localDate: String(form.get("localDate")),
      localTime: String(form.get("localTime")),
      timeZone: String(form.get("timeZone")),
      latitude: Number(form.get("latitude")),
      longitude: Number(form.get("longitude")),
      coordinateSource: String(form.get("coordinateSource")),
      ...(String(form.get("birthTimeAccuracy") ?? "") ? { birthTimeAccuracy: String(form.get("birthTimeAccuracy")) } : {}),
      ayanamsa: String(form.get("ayanamsa")),
      houseSystem: String(form.get("houseSystem")),
      nodeMode: String(form.get("nodeMode")),
      ...(selectedOffset ? { selectedOffset } : {}),
    };
    try {
      const response = await fetch("/api/charts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) {
        setError({ messageKey: "error.calculation", code: result.code, details: result.details });
        if (result.code !== "AMBIGUOUS_LOCAL_TIME") setSelectedOffset("");
      } else {
        setChart(result as Chart);
        window.sessionStorage.setItem("life-current-chart", JSON.stringify(result));
        setSelectedTransits(null);
        setSensitivity(null);
        setSensitivityError(false);
        setSelectedOffset("");
      }
    } catch {
      setError({ messageKey: "error.connection" });
    } finally {
      setBusy(false);
    }
  }

  async function runSensitivity(windowMinutes: 2 | 5 | 15) {
    if (!chart) return;
    setSensitivityWindow(windowMinutes);
    setSensitivityBusy(true);
    setSensitivityError(false);
    try {
      const response = await fetch("/api/charts/sensitivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localDate: chart.input.localDate,
          localTime: chart.input.localTime,
          timeZone: chart.input.timeZone,
          latitude: chart.input.latitude,
          longitude: chart.input.longitude,
          coordinateSource: chart.input.coordinateSource,
          fullName: chart.input.fullName ?? "",
          birthPlace: chart.input.birthPlace,
          ayanamsa: chart.settings.ayanamsa,
          houseSystem: chart.settings.houseSystem,
          nodeMode: chart.settings.node,
          selectedOffset: chart.input.resolvedOffset,
          windowMinutes,
        }),
      });
      const result = await response.json();
      if (!response.ok) setSensitivityError(true);
      else setSensitivity(result as Sensitivity);
    } catch {
      setSensitivityError(true);
    } finally {
      setSensitivityBusy(false);
    }
  }

  function loadProfile(profile: { label: string; birthPlace: string | null; localDate: string; localTime: string | null; timeZone: string | null; latitude: number | null; longitude: number | null; birthTimeAccuracy: string | null }) {
    const form = birthForm.current;
    if (!form) return;
    setChart(null);
    window.sessionStorage.removeItem("life-current-chart");
    setSelectedTransits(null);
    setSensitivity(null);
    const birthYear = typeof profile.localDate === "string" ? Number(profile.localDate.slice(0, 4)) : Number.NaN;
    if (typeof profile.localDate !== "string" || !isValidDateOnly(profile.localDate) || birthYear < 1800 || birthYear > 2399) {
      const dateField = form.elements.namedItem("localDate");
      if (dateField instanceof HTMLInputElement) dateField.value = "";
      setError({ messageKey: "error.invalidProfileDate" });
      setFormValidation({ valid: false, field: "localDate", messageKey: "validation.date" });
      setFormIsValid(false);
      setShowFormValidation(true);
      return;
    }
    const profileFields = {
      ...profile,
      fullName: "",
      birthPlace: profile.birthPlace ?? "",
      localTime: profile.localTime ?? "",
      timeZone: profile.timeZone ?? "",
      latitude: profile.latitude === null ? "" : String(profile.latitude),
      longitude: profile.longitude === null ? "" : String(profile.longitude),
      birthTimeAccuracy: profile.birthTimeAccuracy ?? "",
      coordinateSource: "manual-unknown",
    };
    for (const [name, value] of Object.entries(profileFields)) {
      if (name === "label") continue;
      const field = form.elements.namedItem(name);
      if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) field.value = String(value);
    }
    setError(null);
    setShowFormValidation(true);
    refreshFormValidation();
  }

  const dashaNow = Date.now();
  const currentMahadasha = chart?.vimshottariDasha.mahadashas.find((period) => Date.parse(period.start) <= dashaNow && dashaNow < Date.parse(period.end));
  const currentAntardasha = currentMahadasha?.antardashas.find((period) => Date.parse(period.start) <= dashaNow && dashaNow < Date.parse(period.end));
  const currentPratyantardasha = currentAntardasha?.pratyantardashas.find((period) => Date.parse(period.start) <= dashaNow && dashaNow < Date.parse(period.end));
  const dashaSummary = chart
    ? currentDashaSummary(chart.input.localDate, chart.vimshottariDasha, new Date(dashaNow), undefined, chart.input.timeZone)
    : null;
  const moonPlacement = chart?.planets.find((planet) => planet.name === "Moon");
  const sunPlacement = chart?.planets.find((planet) => planet.name === "Sun");
  const t = (key: string) => translate(language, key);
  const r = (key: Parameters<typeof resultCopy>[1], variables?: Record<string, string | number>) => resultCopy(language, key, variables);
  const visiblePlanets = chart?.planets.filter((planet) => {
    const query = planetSearch.trim().toLocaleLowerCase();
    return !query || `${planet.name} ${planet.sign} ${planet.nakshatra}`.toLocaleLowerCase().includes(query);
  }) ?? [];
  const readinessInput: BirthFormValues = birthForm.current
    ? birthFormValues(birthForm.current)
    : profileDraft;
  const readiness = analysisReadiness(readinessInput, {
    chartCalculated: Boolean(chart),
    supportedAnalysisAvailable: false,
  });
  const readinessBirthDate = readinessInput.localDate;

  return <main className="shell">
    <button type="button" className="mobile-menu-backdrop" aria-label={t("nav.closeMenu")} onClick={closeMobileMenu} hidden={!menuOpen} />
    <aside className={`sidebar${menuOpen ? " mobile-open" : ""}`}>
      <a className="brand" href="#top" aria-label="LIFE"><span className="brand-mark">✳</span><span>LIFE<small>{t("app.workbench")}</small></span></a>
      <div className="workspace-label">{t("nav.workspace")}</div>
      <nav id="life-navigation" className="nav" aria-label={t("nav.workspace")}>{[["chart", "◈", "nav.chart"], ["receipt", "⌁", "nav.receipt"], ["method", "◇", "nav.method"], ["sensitivity", "◷", "nav.sensitivity"], ["/life-timeline", "⌁", "nav.timeline"], ["/dashboard/assistant", "✧", "assistant.title"], ["/dashboard/questions", "▤", "assistant.historyTitle"], ["/remedies", "✦", "nav.remedies"], ["/marriage-timing", "◌", "nav.marriageTiming"], ["/verification", "✓", "nav.verification"], ["faq", "?", "faq.title"]].map(([href, icon, key], index) => <a className={index === 0 ? "active" : ""} href={href.startsWith("/") ? href : `#${href}`} key={href} onClick={() => setMenuOpen(false)}><span aria-hidden="true">{icon}</span> {t(key)}{index === 0 && <kbd>01</kbd>}</a>)}</nav>
      <AccountPanel chart={chart} profileDraft={profileDraft} language={language} onLoadProfile={loadProfile} onLoadSavedChart={(savedChart) => {
        const restoredChart = savedChart as Chart;
        setChart(restoredChart);
        window.sessionStorage.setItem("life-current-chart", JSON.stringify(restoredChart));
        const restoredFields: Record<string, string> = {
          fullName: restoredChart.input.fullName ?? "",
          birthPlace: restoredChart.input.birthPlace ?? "",
          localDate: restoredChart.input.localDate,
          localTime: restoredChart.input.localTime,
          timeZone: restoredChart.input.timeZone,
          latitude: String(restoredChart.input.latitude),
          longitude: String(restoredChart.input.longitude),
          coordinateSource: restoredChart.input.coordinateSource,
          birthTimeAccuracy: restoredChart.input.birthTimeAccuracy,
          ayanamsa: restoredChart.settings.ayanamsa,
          houseSystem: restoredChart.settings.houseSystem,
          nodeMode: restoredChart.settings.node,
        };
        for (const [name, value] of Object.entries(restoredFields)) {
          const field = birthForm.current?.elements.namedItem(name);
          if ((field instanceof HTMLInputElement || field instanceof HTMLSelectElement) && value) field.value = value;
        }
        setSelectedTransits(null);
        setSensitivity(null);
        setSensitivityError(false);
        setError(null);
        setShowFormValidation(true);
        refreshFormValidation();
      }} />
      <div className="sidebar-bottom"><div className="engine-state"><span className={`status-dot ${engine}`} /> <span><b>{t("app.engine")}</b><small>{engine === "checking" ? t("app.checkingEngine") : engine === "ready" ? t("app.engineOnline") : t("app.engineOffline")}</small></span></div><div className="offline-tag"><span>⌁</span> {t("app.noExternalApi")}</div><div className="sidebar-foot">BUILD 0.1.0 <span>AGPL-3.0</span></div></div>
    </aside>

    <section className="main-area" id="top">
      <header className="topbar"><button ref={menuToggle} type="button" className="mobile-menu-toggle" aria-expanded={menuOpen} aria-controls="life-navigation" aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")} onClick={() => setMenuOpen((open) => !open)}>☰ <span>{t("nav.menu")}</span></button><div><span className="crumb">LIFE</span><span className="crumb-sep">/</span><span className="crumb current">{t("nav.chart")}</span></div><div className="topbar-right"><label className="language-picker"><span>{t("language.label")}</span><select aria-label={t("language.label")} value={language} onChange={(event) => selectLanguage(event.target.value)}><option value="en">English</option><option value="hi">हिन्दी</option><option value="hinglish">Hinglish</option></select></label><span className="tag"><i />{engine === "ready" ? t("app.engineOnline") : engine === "checking" ? t("app.checkingEngine") : t("app.engineOffline")}</span><span className="avatar">L</span></div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow">{t("hero.eyebrow")} <span className="eyebrow-line" /></div><h2>{t("hero.title")}</h2><p className="intro">{t("hero.intro")}</p></div><div className="release-pill"><span className="live-dot" /> {t("app.earlyAccess")} <span className="pill-divider" /> {t("app.coreEngine")}</div></div>
        <section className="analysis-readiness" aria-live="polite" aria-label={t("readiness.title")}>
          <div><small>{t("readiness.title")}</small><strong>{t(`readiness.state.${readiness}`)}</strong></div>
          <p>{t(`readiness.${readiness}`)}</p>
          {readinessBirthDate && readiness !== "MISSING_DOB" && <a href={`/life-timeline?date=${encodeURIComponent(readinessBirthDate)}`}>{t("readiness.timelineLink")}</a>}
        </section>

        <div className="studio-grid" id="chart">
          <section className="card form-card"><div className="card-head"><div><div className="section-index">01 <span>—</span> {t("form.input")}</div><h2>{t("form.title")}</h2></div><span className="lock-icon">⌑ <small>{t("form.private")}</small></span></div>
            <form id="birth-form" ref={birthForm} onSubmit={calculate} onInput={(event) => {
              const target = event.target;
              if ((target instanceof HTMLInputElement || target instanceof HTMLSelectElement) && target.name && target.name !== "fullName") {
                if (["birthPlace", "timeZone", "latitude", "longitude"].includes(target.name)) {
                  const sourceField = birthForm.current?.elements.namedItem("coordinateSource");
                  if (sourceField instanceof HTMLSelectElement) sourceField.value = manualLocationEditSource(sourceField.value);
                  setLocationSelectionVersion((version) => version + 1);
                }
                setShowFormValidation(true);
                if (chart) {
                  setChart(null);
                  window.sessionStorage.removeItem("life-current-chart");
                  setSelectedTransits(null);
                  setSensitivity(null);
                }
              }
              setError(null);
              refreshFormValidation();
            }} className="birth-form" noValidate>
              <label className="field-label">{t("form.name")} <span className="muted">{t("form.optionalName")}</span><input name="fullName" type="text" maxLength={120} autoComplete="name" placeholder={t("form.namePlaceholder")} /></label>
              <LocationSearch language={language} onSelect={selectBirthplace} selectionVersion={locationSelectionVersion} />
              <label className="field-label">{t("form.birthPlace")} <span className="muted">{t("form.optional")} · {t("form.placeManual")}</span><input name="birthPlace" type="text" maxLength={160} placeholder={t("form.placePlaceholder")} /><small className="field-hint">{t("form.placeHelp")}</small></label>
              <label className="field-label">{t("form.date")}<input name="localDate" type="date" min="1800-01-01" max="2399-12-31" required aria-required="true" aria-invalid={Boolean(messageForField("localDate"))} />{messageForField("localDate") && <small className="field-error" role="alert">{messageForField("localDate")}</small>}</label>
              <div className="field-row"><label className="field-label">{t("form.time")} <span className="muted">{t("form.optional")}</span><input name="localTime" type="time" step="60" aria-invalid={Boolean(messageForField("localTime"))} />{messageForField("localTime") && <small className="field-error" role="alert">{messageForField("localTime")}</small>}<small className="field-hint">{t("form.timeHelp")}</small></label><label className="field-label">{t("form.accuracy")} <span className="muted">{t("form.optional")}</span><select name="birthTimeAccuracy" defaultValue=""><option value="">{t("form.accuracy.unspecified")}</option><option value="exact">{t("form.accuracy.exact")}</option><option value="within-5-minutes">{t("form.accuracy.5")}</option><option value="within-15-minutes">{t("form.accuracy.15")}</option><option value="within-1-hour">{t("form.accuracy.hour")}</option><option value="approximate">{t("form.accuracy.approximate")}</option></select></label></div>
              <label className="field-label">{t("form.timeZone")} <span className="muted">{t("form.optional")}</span><input name="timeZone" type="text" autoComplete="off" placeholder={t("form.timeZoneHelp")} aria-invalid={Boolean(messageForField("timeZone"))} />{messageForField("timeZone") && <small className="field-error" role="alert">{messageForField("timeZone")}</small>}<small className="field-hint">{t("form.timeZoneHelp")}</small></label>
              <div className="field-row"><label className="field-label">{t("form.latitude")} <span className="muted">{t("form.optional")}</span><input name="latitude" type="number" min="-90" max="90" step="any" placeholder="e.g. 30.483997" aria-invalid={Boolean(messageForField("latitude"))} />{messageForField("latitude") && <small className="field-error" role="alert">{messageForField("latitude")}</small>}</label><label className="field-label">{t("form.longitude")} <span className="muted">{t("form.optional")}</span><input name="longitude" type="number" min="-180" max="180" step="any" placeholder="e.g. 76.593948" aria-invalid={Boolean(messageForField("longitude"))} />{messageForField("longitude") && <small className="field-error" role="alert">{messageForField("longitude")}</small>}</label></div><small className="field-hint">{t("form.coordinatesHelp")}</small>
              <label className="field-label">{t("form.coordinateSource")}<select name="coordinateSource" defaultValue="manual-unknown"><option value="birth-record">{t("form.source.record")}</option><option value="gazetteer">{t("form.source.gazetteer")}</option><option value="manual-unknown">{t("form.source.manual")}</option></select><small className="field-hint">{t("form.sourceHelp")}</small></label>
              <div className="field-row"><label className="field-label">{t("form.ayanamsa")}<select name="ayanamsa" defaultValue="Lahiri"><option>Lahiri</option><option>Raman</option><option>Krishnamurti</option></select></label><label className="field-label">{t("form.houseSystem")}<select name="houseSystem" defaultValue="WholeSign"><option value="WholeSign">{t("form.house.whole")}</option><option value="Placidus">Placidus</option><option value="Koch">Koch</option><option value="Equal">{t("form.house.equal")}</option></select></label></div>
              <label className="field-label">{t("form.nodeMode")}<select name="nodeMode" defaultValue="both"><option value="both">{t("form.node.both")}</option><option value="mean">{t("form.node.mean")}</option><option value="true">{t("form.node.true")}</option></select></label>
              <div className="method-line"><div><span className="method-orb">✳</span><span><b>{t("form.sidereal")}</b><small>{t("form.settingsHelp")}</small></span></div><span className="method-lock">{t("form.localEngine")}</span></div>
              {error && <div className="error-box" role="alert"><span>{t(error.messageKey)}</span>{error.code === "AMBIGUOUS_LOCAL_TIME" && error.details && <label className="field-label offset-choice">{t("app.selectUtcOffset")}<select value={selectedOffset} onChange={(e) => setSelectedOffset(e.target.value)} required><option value="">{t("app.chooseOffset")}</option>{error.details.map((offset) => <option key={offset} value={offset}>{offset}</option>)}</select></label>}</div>}
              {engine !== "ready" && <p className="engine-form-status" role="status">{t(engine === "checking" ? "form.engineChecking" : "form.engineOffline")}</p>}
              <button className="calculate-btn" type="submit" disabled={!canSubmitBirthForm(formIsValid, busy)} aria-busy={busy}>{busy ? <><span className="spinner" /> {t("form.calculating")}</> : <>{t("form.calculate")} <span>↗</span></>}</button>
              <div className="form-foot"><span>◉ {t("form.validationServer")}</span><span>{t("form.notSaved")}</span></div>
            </form>
          </section>

          <section className="card chart-card" id="birth-chart"><div className="card-head"><div><div className="section-index">02 <span>—</span> {t("app.d1Rashi")}</div><h2>{chart ? t("form.chartTitle") : t("form.chartPreview")}</h2></div><span className="chart-badge">D1</span></div>
            {chart ? <><div className="chart-summary"><span className="summary-sun">☼</span><div><b>{chart.ascendant.sign} {t("app.rising")}</b><small>{r("results.birthAscendant")} · {formatDms(chart.ascendant)} · {chart.input.localDate} {chart.input.localTime}</small></div></div><KundliChart chart={chart} language={language} /></> : <div className="empty-chart"><div className="empty-orbit"><span>✳</span><i /><i /><i /></div><b>{t("form.emptyTitle")}</b><p>{t("form.emptyHelp")}</p><div className="empty-stamp"><span>◉</span> {t("form.emptyNoSamples")}</div></div>}
            <div className="chart-bottom"><span>◌ {t("form.geocentric")}</span><span>ⓘ {chart ? t("form.fullPrecision") : t("form.outputAfter")}</span></div>
          </section>
        </div>

        {chart && <nav className="kundli-tabs" aria-label={t("app.dashboardSections")}>{[["overview", "tabs.overview"], ["kundli-details", "kundliDetails.title"], ["birth-chart", "tabs.birthChart"], ["chandra-kundli", "house.moonChart"], ["bhava-chalit", "house.bhavaChalit"], ["bhava-madhya-drishti", "house.midpointDrishti"], ["planetary-positions", "tabs.graha"], ["divisional-charts", "tabs.varga"], ["panchanga", "tabs.panchanga"], ["transits", "tabs.transits"], ["kp", "tabs.kp"], ["predictions", "tabs.predictions"], ["assistant", "assistant.title"], ["rules", "tabs.rules"]].map(([id, key]) => <a href={`#${id}`} key={id}>{t(key)}</a>)}</nav>}
        {chart && <p className="term-note">{r("results.preservedTerms")}</p>}
        {chart && <section className="card positions-card kundli-overview" id="overview">
          <div className="card-head"><div><div className="section-index">{t("app.kundliOverview")}</div><h2>{t("overview.title")}</h2></div><span className="table-count">{chart.settings.ayanamsa} · {chart.settings.houseSystem}</span></div>
          <div className="overview-grid">
            <div><small>{t("overview.lagna")}</small><b>{chart.ascendant.sign}</b><span>{formatDms(chart.ascendant)}</span></div>
            <div><small>{t("overview.moon")}</small><b>{moonPlacement?.sign ?? t("overview.unavailable")}</b><span>{moonPlacement ? `${moonPlacement.nakshatra} · Pada ${moonPlacement.pada}` : t("overview.unavailable")}</span></div>
            <div><small>{t("overview.sun")}</small><b>{sunPlacement?.sign ?? t("overview.unavailable")}</b><span>{sunPlacement ? formatDms(sunPlacement) : t("overview.unavailable")}</span></div>
            <div><small>{t("overview.birthData")}</small><b>{chart.input.localDate} · {chart.input.localTime}</b><span>{chart.input.timeZone} · {chart.input.latitude.toFixed(4)}, {chart.input.longitude.toFixed(4)}</span></div>
          </div>
          <p className="receipt-note">{t("overview.astronomyNote")}</p>
        </section>}
        {chart && <ReferenceLinks title="Calculation and data sources" ids={["source-swiss-ephemeris-info", "jpl-horizons-de441", "source-iana-time-zone-database", "geonames-cities500", "life-chart-conventions", "pyjhora-varga-mapping-fixture", "life-d11-attribution-pending"]} />}
        {chart && <><KundliDetails result={chart} language={language} /><ReferenceLinks title="Kundli classification sources" ids={["saravali-yoni-koota", "saravali-gana-koota", "saravali-nadi-koota", "saravali-varna-koota", "maitreya8-nakshatra-map", "pyjhora-moon-rashi-varna-crosscheck"]} /></>}
        {chart && <HouseAnalysisSections chart={chart} language={language} />}
        {chart && <section className="card positions-card" id="planetary-positions"><div className="card-head"><div><div className="section-index">03 <span>—</span> {r("results.calculatedPositions")}</div><h2>{t("positions.title")}</h2></div><span className="table-count">{chart.planets.length} · D1</span></div><p className="result-guide">{r("results.guide")}</p><label className="field-label result-filter">{r("results.tableSearch")}<input type="search" aria-label={r("results.searchPlanetAria")} placeholder={r("results.searchPlaceholder")} value={planetSearch} onChange={(event) => setPlanetSearch(event.target.value)} /></label><p className="term-note">{r("results.retrogradeGuide")} {r("results.nodes")}</p><div className="table-scroll"><table><thead><tr><th>{r("results.body")}</th><th>RĀŚI</th><th>{r("results.sidereal")}</th><th>{r("results.tropical")}</th><th>{r("results.latitude")}</th><th>{r("results.nakshatraPada")}</th><th>{r("results.houseLabel")}</th><th>{r("results.speed")}</th></tr></thead><tbody>{visiblePlanets.map((planet) => <tr key={planet.name}><td><span className="planet-glyph">{houseShort[planet.name]}</span>{planet.name}</td><td>{planet.sign}</td><td className="mono">{formatDms(planet)}</td><td className="mono">{formatDegrees(planet.tropicalLongitude)}</td><td className="mono">{planet.latitude.toFixed(5)}°</td><td>{planet.nakshatra} <span className="muted">· {planet.pada}</span></td><td>H{String(planet.house).padStart(2, "0")}</td><td className={planet.motion === "Retrograde" ? "retro" : "direct"}>{planet.motion === "Retrograde" ? "℞ " : "↗ "}{planet.longitudeSpeed.toFixed(4)}°/d <span className="sr-only">{planet.motion === "Retrograde" ? r("results.retrogradeLabel") : r("results.direct")}</span></td></tr>)}</tbody></table>{visiblePlanets.length === 0 && <p className="empty-result" role="status">{r("results.noPlanets")}</p>}</div></section>}


        {chart && <DivisionalChartSections chart={chart} language={language} />}

        {chart && <section className="card positions-card dasha-card" id="panchanga">
          <div className="card-head"><div><div className="section-index">{r("results.dashaGuide")}</div><h2>{t("panchanga.title")}</h2></div><span className="table-count">{t("app.vimshottari")}</span></div>
          <p className="result-guide">{r("results.panchangaGuide")} {r("results.dashaGuide")}</p>
          <div className="panchanga-summary">
            <div><small>{r("results.civilWeekday")}</small><b>{chart.vara.civilWeekday}</b></div>
            <div><small>{r("results.sunriseVara")}</small><b>{chart.vara.status === "calculated" ? chart.vara.sunriseBasedVara : t("overview.unavailable")}</b></div>
            <div><small>{t("app.tithiPaksha")}</small><b>{chart.panchanga.tithi.paksha} {chart.panchanga.tithi.name}</b></div>
            <div><small>{t("app.karana")}</small><b>{chart.panchanga.karana}</b></div>
            <div><small>{t("app.yoga")}</small><b>{chart.panchanga.yoga}</b></div>
            <div><small>{r("results.nakshatraPada")}</small><b>{chart.panchanga.nakshatra.name} · {chart.panchanga.nakshatra.pada}</b></div>
            <div><small>{r("results.birthAscendant")} · {t("app.nakshatra")}</small><b>{chart.vimshottariDasha.birthMoon.nakshatra}</b></div>
            <div><small>{r("results.mahadasha")} · {r("results.balance")}</small><b>{chart.vimshottariDasha.startingMahadasha} · {chart.vimshottariDasha.remainingMahadashaBalanceYears.toFixed(3)} {r("results.years")}</b></div>
          </div>
          <div className="dasha-current-summary" aria-live="polite">
            <div><small>{t("dasha.currentAge")}</small><b>{dashaSummary?.age ?? t("overview.unavailable")}</b></div>
            <div><small>{t("dasha.currentMahadasha")}</small><b>{dashaSummary?.mahadasha.lord ?? t("dasha.unavailable")}</b></div>
            <div><small>{t("dasha.currentAntardasha")}</small><b>{dashaSummary?.antardasha?.lord ?? t("dasha.unavailable")}</b></div>
            <div><small>{t("dasha.periodDates")}</small><b>{dashaSummary ? `${dashaSummary.start.slice(0, 10)} – ${dashaSummary.end.slice(0, 10)}` : t("dasha.unavailable")}</b></div>
            <div><small>{t("dasha.remaining")}</small><b>{dashaSummary ? `${dashaSummary.remainingDays} ${t("dasha.days")}` : t("dasha.unavailable")}</b></div>
          </div>
          <div className="current-dasha" aria-live="polite"><b>{r("results.periodNow")} · {new Date(dashaNow).toISOString().slice(0, 10)} UTC</b><span>{currentMahadasha ? `${currentMahadasha.lord} ${r("results.mahadasha")}${currentAntardasha ? ` / ${currentAntardasha.lord} ${r("results.antardasha")}` : ""}${currentPratyantardasha ? ` / ${currentPratyantardasha.lord} ${r("results.pratyantardasha")}` : ""}` : t("dasha.unavailable")}</span></div>
          <p className="term-note">{dashaSummary?.method ?? t("dasha.method")} · {dashaSummary ? t("dasha.calculated") : t("dasha.unavailable")}</p>
          <div className="table-scroll"><table><thead><tr><th>{r("results.mahadasha")}</th><th>{r("results.starts")}</th><th>{r("results.ends")}</th><th>{r("results.antardasha")}</th><th>{r("results.pratyantardasha")}</th></tr></thead><tbody>{chart.vimshottariDasha.mahadashas.filter((period) => Date.parse(period.end) > dashaNow).slice(0, 4).map((period) => { const antardashas = period.antardashas.filter((item) => Date.parse(item.end) > dashaNow).slice(0, 3); return <tr key={`${period.lord}-${period.start}`}><td>{period.lord}{period === currentMahadasha ? ` · ${r("results.current")}` : ""}</td><td className="mono">{period.start.slice(0, 10)}</td><td className="mono">{period.end.slice(0, 10)}</td><td>{antardashas.map((item) => `${item.lord}${item === currentAntardasha ? ` (${r("results.current")})` : ""}`).join(" · ")}</td><td>{antardashas.map((item) => `${item.lord}: ${item.pratyantardashas.filter((sub) => Date.parse(sub.end) > dashaNow).slice(0, 3).map((sub) => `${sub.lord}${sub === currentPratyantardasha ? ` (${r("results.current")})` : ""} ${sub.start.slice(0, 10)}–${sub.end.slice(0, 10)}`).join(", ")}`).join("; ")}</td></tr>; })}</tbody></table></div>
        </section>}
        {chart && <section className="card positions-card cusp-card"><div className="card-head"><div><div className="section-index">{r("results.houseCuspTitle")}</div><h2>{r("results.houseCuspTitle")}</h2></div><span className="table-count">{chart.settings.houseSystem}</span></div><p className="result-guide">{r("results.cuspsGuide")} {r("results.houseSystem")}: {chart.settings.houseSystem}.</p><div className="table-scroll"><table><thead><tr><th>{r("results.house")}</th><th>{r("results.signAtCusp")}</th><th>{r("results.siderealLongitude")}</th></tr></thead><tbody>{chart.houses.map((house) => <tr key={house.house}><td>H{String(house.house).padStart(2, "0")}</td><td>{house.sign}</td><td className="mono">{formatDegrees(house.cuspLongitude)}</td></tr>)}</tbody></table></div><div className="receipt-note">{r("results.birthAscendant")} {chart.ascendant.sign} {formatDms(chart.ascendant)} · {r("results.midheaven")} {chart.mc.sign} {formatDms(chart.mc)}</div></section>}

        {chart && <RiseSetSection chart={chart} language={language} />}
        {chart && <TransitSection key={chart.provenance.resultHash} chart={chart} language={language} onTransitChange={setSelectedTransits} />}
        {chart && <DignityAspectSection chart={chart} language={language} />}
        {chart && <YogaSection chart={chart} language={language} />}
        {chart && <KpSection chart={chart} language={language} />}
        {chart && <InterpretationPanel chart={{ ...chart, transits: selectedTransits ?? undefined }} language={language} />}
        <KundliAssistant chart={chart ? { ...chart, transits: selectedTransits ?? chart.transits } : null} language={language} />
        {chart && <section className="card sensitivity-card" id="sensitivity"><div className="card-head"><div><div className="section-index">{r("results.sensitivityTitle")}</div><h2>{r("results.sensitivityHeading")}</h2></div><span className="sensitivity-symbol">◷</span></div><div className="sensitivity-intro"><p>{r("results.sensitivityIntro")}</p><div className="sensitivity-controls"><span>{r("results.window")}</span>{([2, 5, 15] as const).map((minutes) => <button type="button" key={minutes} className={sensitivityWindow === minutes ? "selected" : ""} disabled={sensitivityBusy} onClick={() => runSensitivity(minutes)}>±{minutes}m</button>)}</div></div>{sensitivityBusy ? <div className="sensitivity-loading"><span className="spinner dark" /> {r("results.sampling", { minutes: sensitivityWindow })}</div> : sensitivityError ? <div className="sensitivity-error" role="alert">{r("results.sensitivityError")}</div> : sensitivity ? <><div className="sensitivity-summary"><span className="sensitivity-mark">{sensitivity.changes.some((item) => !item.stable) ? "↗" : "✓"}</span><b>{sensitivity.changes.filter((item) => !item.stable).length ? `${sensitivity.changes.filter((item) => !item.stable).length} ${r("results.classificationsChange")}` : r("results.stable")}</b><span>{sensitivity.sampleCount} {r("results.samples")} · {r("results.minuteSteps")} · Lagna span {sensitivity.lagnaRange.spanDegrees.toFixed(3)}°</span></div><div className="sensitivity-list">{sensitivity.changes.filter((item) => !item.stable).length ? sensitivity.changes.filter((item) => !item.stable).map((item) => <div className="sensitivity-row" key={item.label}><b>{item.label}</b><span>{item.outcomes.map(formatOutcome).join("  /  ")}</span><small>{item.transitions.length} {r("results.transitions")}</small></div>) : <p className="stable-note">{r("results.stableNote")}</p>}</div></> : <div className="sensitivity-empty"><span>±</span><div><b>{r("results.inspectWindow")}</b><small>{r("results.chooseSweep")}</small></div><button type="button" onClick={() => runSensitivity(5)}>{r("results.runSweep")} <span>↗</span></button></div>}</section>}

        <div className="lower-grid">
          <section className="card receipt-card" id="receipt"><div className="card-head"><div><div className="section-index">{r("results.provenance")}</div><h2>{t("nav.receipt")}</h2></div><span className="receipt-icon">⌁</span></div>{chart ? <div className="receipt-content"><div className="receipt-status"><span className="status-check">✓</span><div><b>{r("results.receiptCalculated")}</b><small>{chart.provenance.engineVersion} · {r("results.localCalculation")}</small></div><span className="receipt-ready">{r("results.calculatedStatus")}</span></div><div className="receipt-grid"><Receipt label={r("results.person")} value={chart.input.fullName ?? r("results.notProvided")} /><Receipt label={r("results.birthplace")} value={chart.input.birthPlace ?? r("results.notProvided")} /><Receipt label={r("results.localBirth")} value={`${chart.input.localDate} · ${chart.input.localTime}`} /><Receipt label={r("results.timeAccuracy")} value={chart.input.birthTimeAccuracy} /><Receipt label={r("results.coordinates")} value={`${chart.input.latitude.toFixed(5)}, ${chart.input.longitude.toFixed(5)}`} mono /><Receipt label={r("results.coordinateSource")} value={chart.input.coordinateSource} /><Receipt label={r("results.zoneOffset")} value={`${chart.input.timeZone} · UTC${chart.input.resolvedOffset}`} /><Receipt label={r("results.normalizedUtc")} value={chart.input.utc} /><Receipt label={r("results.julianDay")} value={chart.input.julianDayUtc.toFixed(8)} mono /><Receipt label={r("results.timeScaleNote")} value="UTC used as UT1 proxy; no DUT1 correction; Delta T is internal to calc_ut" /><Receipt label={r("results.ayanamsa")} value={`${chart.settings.ayanamsa} · ${chart.ayanamsa.toFixed(8)}°`} /><Receipt label={r("results.houseSystem")} value={chart.settings.houseSystem} /><Receipt label={r("results.nodeMode")} value={chart.settings.node} /><Receipt label={r("results.midheaven")} value={`${chart.mc.sign} ${formatDms(chart.mc)}`} /><Receipt label={r("results.nativeBinding")} value={`@swisseph/node ${chart.settings.bindingVersion}`} /><Receipt label={r("results.nodeRuntime")} value={chart.settings.runtimeVersion} /><Receipt label={r("results.swissLibrary")} value={chart.settings.swissEphemerisLibraryVersion === "not-exposed-by-binding" ? t("overview.unavailable") : chart.settings.swissEphemerisLibraryVersion} /><Receipt label={r("results.timeZoneDatabase")} value={chart.settings.timezoneDatabaseVersion} /><Receipt label={r("results.manifestVersion")} value={String(chart.settings.ephemerisManifestVersion)} /><Receipt label={r("results.engineFlags")} value={`Swiss Ephemeris · ${chart.settings.flags}`} /><Receipt label={r("results.ephemerisAssets")} value={chart.settings.ephemerisAssets.map((asset) => `${asset.filename} · ${asset.sha256.slice(0, 12)}…`).join(" / ")} mono /><Receipt label={r("results.packageIntegrity")} value={chart.settings.npmTarballIntegrity.slice(0, 20) + "…"} mono /><Receipt label={r("results.independentReference")} value={r("results.independentNotPerformed")} /></div><div className="hash-line"><span>{r("results.resultHash")}</span><code>{chart.provenance.resultHash}</code><button type="button" onClick={() => navigator.clipboard?.writeText(chart.provenance.resultHash)} aria-label={r("results.copyHash")}>{r("results.copy")}</button></div><p className="result-guide">{r("results.receiptNote")}</p></div> : <div className="receipt-empty"><p>{r("results.receiptEmpty")}</p><div className="receipt-row"><span>01</span> {r("results.receiptInput")}<span className="receipt-pending">{r("results.waiting")}</span></div><div className="receipt-row"><span>02</span> {r("results.receiptEngine")}<span className="receipt-pending">{r("results.waiting")}</span></div><div className="receipt-row"><span>03</span> {r("results.receiptSettings")}<span className="receipt-pending">{r("results.waiting")}</span></div></div>}</section>
          <section className="card method-card" id="method"><div className="card-head"><div><div className="section-index">{r("results.method")}</div><h2>{r("results.methodTitle")}</h2></div><span className="method-glyph">◇</span></div><div className="method-content"><div className="method-item"><span className="method-num">01</span><div><b>{r("results.resolveClock")}</b><p>{r("results.resolveClockBody")}</p></div></div><div className="method-item"><span className="method-num">02</span><div><b>{r("results.localEphemeris")}</b><p>{r("results.localEphemerisBody")}</p></div></div><div className="method-item"><span className="method-num">03</span><div><b>{r("results.tradition")}</b><p>{r("results.traditionBody")}</p></div></div><div className="not-science">✳ &nbsp;{r("results.notScience")}</div></div><ReferenceLinks title="Calculation conventions" ids={["life-chart-conventions", "life-interpretation-attributions-pending"]} /></section>
        </div>

      </div>
    </section>
  </main>;
}

function formatDms(value: { degrees: number; minutes: number; seconds: number }) {
  return `${String(value.degrees).padStart(2, "0")}° ${String(value.minutes).padStart(2, "0")}′ ${String(value.seconds).padStart(2, "0")}″`;
}

function formatDegrees(longitude: number) {
  const degrees = Math.floor(longitude);
  const minutesFloat = (longitude - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = Math.floor((minutesFloat - minutes) * 60);
  return `${String(degrees).padStart(3, "0")}° ${String(minutes).padStart(2, "0")}′ ${String(seconds).padStart(2, "0")}″`;
}

function formatOutcome(value: string) {
  const parts = value.split("|");
  if (parts.length === 1) return parts[0];
  if (parts.length === 4 && parts.slice(1).every((part) => /^\d+$/.test(part))) {
    return `${parts[0]} ${String(parts[1]).padStart(2, "0")}° ${String(parts[2]).padStart(2, "0")}′ ${String(parts[3]).padStart(2, "0")}″`;
  }
  return `${parts[0]} · ${parts[1]} p${parts[2]} · H${parts[3]}`;
}

function housePoint(house: number) {
  const points = [
    { x: 200, y: 51 }, { x: 113, y: 84 }, { x: 61, y: 145 }, { x: 113, y: 285 },
    { x: 63, y: 348 }, { x: 200, y: 348 }, { x: 200, y: 315 }, { x: 337, y: 348 },
    { x: 285, y: 285 }, { x: 337, y: 145 }, { x: 285, y: 84 }, { x: 200, y: 84 },
  ];
  return points[house - 1];
}

function Receipt({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="receipt-field"><span>{label}</span><b className={mono ? "mono" : ""}>{value}</b></div>;
}

function RiseSetSection({ chart, language }: { chart: Chart; language: Language }) {
  const r = (key: Parameters<typeof resultCopy>[1]) => resultCopy(language, key);
  const events = [chart.riseSet.sunrise, chart.riseSet.sunset, chart.riseSet.moonrise, chart.riseSet.moonset];
  const eventLabel = (name: string) => {
    switch (name.toLowerCase()) {
      case "sunrise": return r("results.sunrise");
      case "sunset": return r("results.sunset");
      case "moonrise": return r("results.moonrise");
      case "moonset": return r("results.moonset");
      default: return name;
    }
  };
  return <section className="card positions-card" id="rise-set">
    <div className="card-head"><div><div className="section-index">{r("results.riseSetTitle")}</div><h2>{r("results.riseSetTitle")}</h2></div><span className="table-count">{chart.riseSet.library}</span></div>
    <p className="result-guide">{r("results.riseSetGuide")}</p>
    <div className="panchanga-summary">
      {events.map((event) => <div key={event.event}>
        <small>{eventLabel(event.event)}</small>
        {event.status === "calculated" && event.localTime ? <b>{event.localTime.slice(11)}</b> : <b>{r("results.noEvent")}</b>}
        {event.status === "calculated" && event.occursOnReferenceDate === false && event.eventLocalDate ? <small className="muted">{r("results.nextLocalDay")} · {event.eventLocalDate}</small> : null}
      </div>)}
      <div><small>{r("results.sunriseVara")}</small><b>{chart.vara.status === "calculated" ? chart.vara.sunriseBasedVara : translate(language, "overview.unavailable")}</b></div>
      <div><small>{r("results.civilWeekday")}</small><b>{chart.vara.civilWeekday}</b></div>
    </div>
  </section>;
}

function TransitSection({ chart, onTransitChange, language }: { chart: Chart; onTransitChange: (transits: Transits | null) => void; language: Language }) {
  const r = (key: Parameters<typeof resultCopy>[1]) => resultCopy(language, key);
  const [selectedDate, setSelectedDate] = useState(() => new Intl.DateTimeFormat("en-CA", {
    timeZone: chart.input.timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()));
  const [transits, setTransits] = useState<Transits | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  async function calculateSelectedTransit() {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/transits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localDate: selectedDate,
          timeZone: chart.input.timeZone,
          latitude: chart.input.latitude,
          longitude: chart.input.longitude,
          ayanamsa: chart.settings.ayanamsa,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(true);
        setTransits(null);
        onTransitChange(null);
        return;
      }
      setTransits(result as Transits);
      onTransitChange(result as Transits);
    } catch {
      setError(true);
      setTransits(null);
      onTransitChange(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void calculateSelectedTransit(); }, []);
  return <section className="card positions-card" id="transits">
    <div className="card-head"><div><div className="section-index">{r("results.transitTitle")}</div><h2>{r("results.transitTitle")}</h2></div><span className="table-count">{chart.settings.ayanamsa} · {r("results.localCalculation")}</span></div>
    <p className="result-guide">{r("results.transitGuide")}</p>
    <div className="transit-date-control"><label className="field-label">{r("results.transitDate")}<input aria-label={r("results.transitDate")} type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label><button type="button" className="account-action" disabled={loading || !selectedDate} onClick={() => void calculateSelectedTransit()}>{loading ? r("results.calculatingTransits") : r("results.calculateDate")}</button></div>
    {error && <div role="alert" className="error-box">{r("results.calculationError")}</div>}
    {loading && <p role="status">{r("results.transitLoading")}</p>}
    {transits && <><p className="term-note">{r("results.transitSnapshot")}: {transits.instantUtc}.</p><div className="table-scroll"><table><thead><tr><th>{r("results.body")}</th><th>{r("results.natalSign")}</th><th>{r("results.transitSign")}</th><th>{r("results.transitLongitude")}</th><th>{r("results.nakshatraPada")}</th><th>{r("results.nextIngress")}</th><th>{r("results.direction")}</th><th>{r("results.refinedTo")}</th></tr></thead><tbody>{transits.bodies.map((body) => { const natal = chart.planets.find((planet) => planet.name === body.name); return <tr key={body.name}><td><span className="planet-glyph">{houseShort[body.name] ?? body.name.slice(0, 2)}</span>{body.name}</td><td>{natal?.sign ?? "—"}</td><td>{body.sign}</td><td className="mono">{formatDegrees(body.longitude)}</td><td>{body.nakshatra} <span className="muted">· {body.pada}</span></td><td className="mono">{body.nextSignIngress ? `${body.nextSignIngress.utc.slice(0, 10)} · ${body.nextSignIngress.fromSign} → ${body.nextSignIngress.toSign}` : r("results.beyondHorizon")}</td><td>{body.nextSignIngress ? body.nextSignIngress.direction : "—"}</td><td className="mono">{body.nextSignIngress ? `±${(body.nextSignIngress.refinementDays * 86_400).toFixed(3)}s` : "—"}</td></tr>; })}</tbody></table></div></>}
  </section>;
}

function DignityAspectSection({ chart, language }: { chart: Chart; language: Language }) {
  const r = (key: Parameters<typeof resultCopy>[1]) => resultCopy(language, key);
  return <section className="card positions-card varga-card" id="planetary-rules">
    <div className="card-head"><div><div className="section-index">{r("results.dignityTitle")}</div><h2>{r("results.dignityTitle")}</h2></div><span className="table-count">PARASHARI</span></div>
    <p className="result-guide">{r("results.dignityGuide")}</p>
    <PlanetaryStatusPanel natalPlanets={chart.planets} divisionalPlanets={chart.planets} language={language} title={r("results.dignityTitle")} calculationStatus={chart.provenance.status} />
    <div className="varga-grid">
      <div className="table-scroll"><h3>{r("results.dignity")}</h3><table><thead><tr><th>{r("results.body")}</th><th>RĀŚI</th><th>{r("results.position")}</th><th>{r("results.signLord")}</th><th>{r("results.dignity")}</th><th>{r("results.state")}</th></tr></thead><tbody>{chart.planetaryDignity.map((planet) => <tr key={planet.name}><td>{planet.name}</td><td>{planet.sign}</td><td className="mono">{formatDegrees(planet.degreesInSign)}</td><td>{planet.signLord}</td><td>{planet.dignity}</td><td>{[planet.combust ? r("results.combust") : null, planet.retrograde === null ? null : planet.retrograde ? r("results.retrogradeLabel") : r("results.direct")].filter(Boolean).join(" · ") || "—"}</td></tr>)}</tbody></table></div>
      <div className="table-scroll"><h3>{r("results.fullAspects")}</h3><table><thead><tr><th>{r("results.body")}</th><th>{r("results.houseColumn")}</th><th>{r("results.aspectedHouses")}</th><th>{r("results.aspectedBodies")}</th></tr></thead><tbody>{chart.planetaryAspects.details.map((detail) => <tr key={detail.name}><td>{detail.name}</td><td>H{String(detail.house).padStart(2, "0")}</td><td>{detail.aspectsHouses.map((house) => `H${String(house).padStart(2, "0")}`).join(" · ")}</td><td>{detail.aspectsPlanets.join(" · ") || "—"}</td></tr>)}</tbody></table></div>
    </div>
  </section>;
}

function YogaSection({ chart, language }: { chart: Chart; language: Language }) {
  const r = (key: Parameters<typeof resultCopy>[1]) => resultCopy(language, key);
  const t = (key: string) => translate(language, key);
  const present = chart.yogasAndDoshas.filter((finding) => finding.present);
  return <section className="card positions-card" id="rules">
    <div className="card-head"><div><div className="section-index">{t("app.yogasDoshas")}</div><h2>{r("results.yogaTitle")}</h2></div><span className="table-count">{present.length} {r("results.presentRules")} · {chart.yogasAndDoshas.length}</span></div>
    <p className="result-guide">{r("results.yogaGuide")}</p>
    {present.length ? <div className="table-scroll"><table><thead><tr><th>{r("results.name")}</th><th>{r("results.type")}</th><th>{r("results.bodies")}</th><th>{r("results.ruleApplied")}</th><th>{r("results.note")}</th></tr></thead><tbody>{present.map((finding) => <tr key={finding.id}><td>{finding.name}</td><td>{finding.category}</td><td>{finding.planets.join(" · ") || "—"}</td><td>{finding.rule}</td><td>{finding.detail ?? "—"}</td></tr>)}</tbody></table></div> : <div className="empty-result" role="status">{r("results.noYoga")}</div>}
  </section>;
}

function KpSection({ chart, language }: { chart: Chart; language: Language }) {
  const r = (key: Parameters<typeof resultCopy>[1]) => resultCopy(language, key);
  if (!chart.kp) return <section className="card positions-card" id="kp">
    <div className="card-head"><div><div className="section-index">KP</div><h2>{r("results.kpTitle")}</h2></div><span className="table-count">{translate(language, "overview.unavailable")}</span></div>
    <p className="empty-result" role="status">{r("results.kpUnavailable")} {r("results.adjustInput")}</p>
  </section>;
  return <section className="card positions-card" id="kp">
    <div className="card-head"><div><div className="section-index">KP</div><h2>{r("results.kpTitle")}</h2></div><span className="table-count">{chart.kp.houseSystem} · {chart.kp.ayanamsa} {chart.kp.ayanamsaValue.toFixed(6)}°</span></div>
    <p className="result-guide">{r("results.kpGuide")}</p>
    <div className="table-scroll"><table><thead><tr><th>{r("results.body")}</th><th>RĀŚI</th><th>{r("results.signLord")}</th><th>{r("results.starLord")}</th><th>{r("results.subLord")}</th><th>{r("results.subSubLord")}</th><th>{r("results.houseColumn")}</th><th>{r("results.signifies")}</th></tr></thead><tbody>{chart.kp.planets.map((planet) => <tr key={planet.name}><td>{planet.name}</td><td>{planet.sign}</td><td>{planet.signLord}</td><td>{planet.nakshatra.name} · {planet.nakshatra.lord}</td><td>{planet.sub.lord}</td><td>{planet.subSub.lord}</td><td>H{String(planet.house).padStart(2, "0")}</td><td>{planet.significations.houses.map((house) => `H${house}`).join(" · ") || "—"}</td></tr>)}</tbody></table></div>
    <div className="table-scroll"><table><thead><tr><th>{r("results.cusp")}</th><th>RĀŚI</th><th>{r("results.signLord")}</th><th>{r("results.starLord")}</th><th>{r("results.subLord")}</th><th>{r("results.subSubLord")}</th><th>{r("results.signifiedBy")}</th></tr></thead><tbody>{chart.kp.cusps.map((cusp) => <tr key={cusp.house}><td>H{String(cusp.house).padStart(2, "0")}</td><td>{cusp.sign}</td><td>{cusp.signLord}</td><td>{cusp.nakshatra.name} · {cusp.nakshatra.lord}</td><td>{cusp.sub.lord}</td><td>{cusp.subSub.lord}</td><td>{cusp.signifiedBy.join(" · ") || "—"}</td></tr>)}</tbody></table></div>
  </section>;
}
