"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import {
  FINGER_LENGTHS,
  HAND_SHAPES,
  LINE_NAMES,
  LINE_QUALITIES,
  MOUNT_LEVELS,
  MOUNT_NAMES,
  PALM_KNOWLEDGE,
  PALM_SIDES,
  THUMB_TYPES,
  detectPalmContradictions,
  answerPalmQuestion,
  comparePalmObservations,
  generatePalmReport,
  labelPalmSide,
  searchPalmKnowledge,
  type FingerLength,
  type HandShape,
  type LineName,
  type LineQuality,
  type MountLevel,
  type MountName,
  type PalmObservations,
  type PalmLanguage,
  type PalmSide,
  type ThumbType,
} from "@/palmistry/engine";
import { PALM_SOURCES, PALM_TRADITION_DIFFERENCES } from "@/palmistry/sources";
import { getApprovedExternalHref } from "@/presentation/external-link-policy";
import {
  PALM_FEATURE_DEFINITIONS,
  PALM_OBSERVATION_OPTIONS,
  createEmptyPalmFeatureObservation,
  type PalmFeatureId,
  type PalmFeatureObservation,
} from "@/palmistry/knowledge";
import {
  deletePalmReading,
  listPalmReadings,
  savePalmReading,
  type SavedPalmReading,
} from "@/palmistry/storage";
import { printReport } from "@/presentation/report-print";
import "./palmistry/palmistry.css";

type PalmDraft = {
  handShape: HandShape | "";
  fingerLength: FingerLength | "";
  thumb: ThumbType | "";
  lines: Record<LineName, LineQuality>;
  mounts: Record<MountName, MountLevel>;
  dominantHand: PalmObservations["dominantHand"];
  observationConfidence: PalmObservations["observationConfidence"];
  featureObservations: PalmObservations["featureObservations"];
};

type WorkspaceTab = "reading" | "compare" | "history" | "knowledge";
type OfflineShellStatus = "installing" | "ready" | "unavailable";

const lineLabels: Record<LineName, string> = {
  life: "Life line",
  head: "Head line",
  heart: "Heart line",
  fate: "Fate line",
  sun: "Sun (Apollo) line",
};

const mountLabels: Record<MountName, string> = {
  venus: "Mount of Venus",
  jupiter: "Mount of Jupiter",
  saturn: "Mount of Saturn",
  apollo: "Mount of Apollo",
  mercury: "Mount of Mercury",
  moon: "Mount of Moon",
  mars: "Mount of Mars",
};

const blankDraft: PalmDraft = {
  handShape: "",
  fingerLength: "",
  thumb: "",
  lines: { life: "not-observed", head: "not-observed", heart: "not-observed", fate: "not-observed", sun: "not-observed" },
  mounts: { venus: "not-observed", jupiter: "not-observed", saturn: "not-observed", apollo: "not-observed", mercury: "not-observed", moon: "not-observed", mars: "not-observed" },
  dominantHand: "unknown",
  observationConfidence: "medium",
  featureObservations: {},
};

const diagramLines = [
  { id: "line.life", label: "Life line", path: "M78 104 C80 132 94 163 112 192" },
  { id: "line.head", label: "Head line", path: "M78 118 C106 119 133 127 158 130" },
  { id: "line.heart", label: "Heart line", path: "M77 88 C101 84 130 87 157 93" },
  { id: "line.fate", label: "Fate line", path: "M116 188 C115 159 118 130 116 96" },
  { id: "line.sun", label: "Sun line", path: "M139 119 C140 103 140 91 139 77" },
  { id: "line.mercury", label: "Mercury line", path: "M151 135 C152 116 153 101 154 86" },
] as const;

const diagramMounts = [
  { id: "mount.jupiter", label: "Jupiter", x: 91, y: 64 },
  { id: "mount.saturn", label: "Saturn", x: 112, y: 57 },
  { id: "mount.apollo", label: "Apollo", x: 135, y: 61 },
  { id: "mount.mercury", label: "Mercury", x: 154, y: 71 },
  { id: "mount.venus", label: "Venus", x: 75, y: 131 },
  { id: "mount.moon", label: "Moon", x: 153, y: 178 },
  { id: "mount.lower-mars", label: "Lower Mars", x: 82, y: 114 },
  { id: "mount.upper-mars", label: "Upper Mars", x: 157, y: 118 },
  { id: "mount.plain-mars", label: "Plain of Mars", x: 116, y: 143 },
] as const;

function observationsFromDraft(draft: PalmDraft): PalmObservations | null {
  if (!draft.handShape || !draft.fingerLength || !draft.thumb) return null;
  return {
    handShape: draft.handShape,
    fingerLength: draft.fingerLength,
    thumb: draft.thumb,
    lines: draft.lines,
    mounts: draft.mounts,
    dominantHand: draft.dominantHand,
    observationConfidence: draft.observationConfidence,
    featureObservations: draft.featureObservations,
  };
}

function optionLabel(value: string) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Date unavailable";
}

export default function PalmistryWorkspace() {
  const [tab, setTab] = useState<WorkspaceTab>("reading");
  const [side, setSide] = useState<PalmSide>("left");
  const [reportLanguage, setReportLanguage] = useState<PalmLanguage>("en");
  const [activeFeatureId, setActiveFeatureId] = useState<PalmFeatureId>("line.life");
  const [draft, setDraft] = useState<PalmDraft>(blankDraft);
  const [title, setTitle] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [readings, setReadings] = useState<SavedPalmReading[]>([]);
  const [selectedReadingId, setSelectedReadingId] = useState("");
  const [leftReadingId, setLeftReadingId] = useState("");
  const [rightReadingId, setRightReadingId] = useState("");
  const [query, setQuery] = useState("");
  const [question, setQuestion] = useState("");
  const [questionAnswer, setQuestionAnswer] = useState<ReturnType<typeof answerPalmQuestion>>(null);
  const [questionAttempted, setQuestionAttempted] = useState(false);
  const [online, setOnline] = useState(true);
  const [offlineShellStatus, setOfflineShellStatus] = useState<OfflineShellStatus>("installing");
  const [storageReady, setStorageReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const observations = useMemo(() => observationsFromDraft(draft), [draft]);
  const oppositeReading = readings.find((reading) => reading.side !== side);
  const comparison = observations && oppositeReading
    ? side === "left" ? { left: observations, right: oppositeReading.observations } : { left: oppositeReading.observations, right: observations }
    : undefined;
  const report = useMemo(
    () => observations ? generatePalmReport(observations, side, reportLanguage, comparison) : null,
    [observations, side, reportLanguage, comparison?.left, comparison?.right],
  );
  const selectedReading = readings.find((reading) => reading.id === selectedReadingId) ?? null;
  const leftReading = readings.find((reading) => reading.id === leftReadingId && reading.side === "left") ?? null;
  const rightReading = readings.find((reading) => reading.id === rightReadingId && reading.side === "right") ?? null;
  const differences = leftReading && rightReading
    ? comparePalmObservations(leftReading.observations, rightReading.observations)
    : null;
  const knowledgeResults = query.trim()
    ? searchPalmKnowledge(query)
    : PALM_KNOWLEDGE.slice(0, 8);
  const activeFeature = PALM_FEATURE_DEFINITIONS.find((feature) => feature.id === activeFeatureId);
  const activeFeatureObservation = draft.featureObservations?.[activeFeatureId] ?? createEmptyPalmFeatureObservation();
  const observedFeatureCount = Object.values(draft.featureObservations ?? {}).filter((value) => value && value.presence !== "not-assessed").length;
  const coreObservationCount = [draft.handShape, draft.fingerLength, draft.thumb].filter(Boolean).length
    + Object.values(draft.lines).filter((value) => value !== "not-observed").length
    + Object.values(draft.mounts).filter((value) => value !== "not-observed").length;
  const observationIssues = observations ? detectPalmContradictions(observations) : [];

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setOfflineShellStatus("unavailable");
      return;
    }
    let active = true;
    void navigator.serviceWorker.register("/palmistry-sw.js", { scope: "/" }).then(async (registration) => {
      const worker = registration.installing ?? registration.waiting ?? registration.active;
      if (!worker) throw new Error("The Palmistry offline worker is unavailable.");
      if (worker.state !== "activated") {
        await new Promise<void>((resolve) => {
          const onStateChange = () => {
            if (worker.state === "activated" || worker.state === "redundant") {
              worker.removeEventListener("statechange", onStateChange);
              resolve();
            }
          };
          worker.addEventListener("statechange", onStateChange);
          onStateChange();
        });
      }
      if (worker.state !== "activated") throw new Error("The Palmistry offline page could not be cached.");
      await navigator.serviceWorker.ready;
      if (active) setOfflineShellStatus("ready");
    }).catch(() => {
      if (active) setOfflineShellStatus("unavailable");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void listPalmReadings().then((items) => {
      if (!active) return;
      setReadings(items);
      setSelectedReadingId(items[0]?.id ?? "");
      setLeftReadingId(items.find((item) => item.side === "left")?.id ?? "");
      setRightReadingId(items.find((item) => item.side === "right")?.id ?? "");
      setStorageReady(true);
    }).catch((storageError: unknown) => {
      if (!active) return;
      setError(storageError instanceof Error ? storageError.message : "Local reading history could not be loaded.");
      setStorageReady(true);
    });
    return () => { active = false; };
  }, []);

  function updateLine(line: LineName, value: LineQuality) {
    setDraft((current) => ({ ...current, lines: { ...current.lines, [line]: value } }));
  }

  function updateMount(mount: MountName, value: MountLevel) {
    setDraft((current) => ({ ...current, mounts: { ...current.mounts, [mount]: value } }));
  }

  function updateFeature<Key extends keyof PalmFeatureObservation>(field: Key, value: PalmFeatureObservation[Key]) {
    setDraft((current) => ({
      ...current,
      featureObservations: {
        ...current.featureObservations,
        [activeFeatureId]: { ...(current.featureObservations?.[activeFeatureId] ?? createEmptyPalmFeatureObservation()), [field]: value },
      },
    }));
  }

  function editSavedReading(reading: SavedPalmReading) {
    setDraft({
      ...blankDraft,
      ...reading.observations,
      lines: { ...blankDraft.lines, ...reading.observations.lines },
      mounts: { ...blankDraft.mounts, ...reading.observations.mounts },
      dominantHand: reading.observations.dominantHand ?? "unknown",
      observationConfidence: reading.observations.observationConfidence ?? "medium",
      featureObservations: reading.observations.featureObservations ?? {},
    });
    setSide(reading.side);
    setTitle(reading.title);
    setImageDataUrl(reading.imageDataUrl);
    setActiveFeatureId("line.life");
    setTab("reading");
    setError("");
    setNotice("Edit the observations and save a corrected reading.");
  }

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    setNotice("");
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      event.currentTarget.value = "";
      setError("Choose a JPEG, PNG or WebP image. The image is previewed only and is never analyzed.");
      return;
    }
    if (file.size > 3_000_000) {
      event.currentTarget.value = "";
      setError("Choose an image smaller than 3 MB to keep the saved reading manageable.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setError("The selected image could not be read on this device.");
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("The selected image could not be previewed.");
        return;
      }
      setImageDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function saveReading() {
    if (!observations || !report) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const reading: SavedPalmReading = {
        id: window.crypto.randomUUID(),
        title: title.trim().slice(0, 80) || `${labelPalmSide(side)} · ${new Date().toLocaleDateString()}`,
        side,
        createdAt: new Date().toISOString(),
        observations,
        report,
        imageDataUrl,
      };
      await savePalmReading(reading);
      const updated = await listPalmReadings();
      setReadings(updated);
      setSelectedReadingId(reading.id);
      if (side === "left") setLeftReadingId(reading.id);
      else setRightReadingId(reading.id);
      setNotice("Reading and report saved on this device.");
      setTab("history");
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "The reading could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function removeReading(reading: SavedPalmReading) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await deletePalmReading(reading.id);
      const updated = await listPalmReadings();
      setReadings(updated);
      setSelectedReadingId(updated[0]?.id ?? "");
      setLeftReadingId((current) => current === reading.id ? updated.find((item) => item.side === "left")?.id ?? "" : current);
      setRightReadingId((current) => current === reading.id ? updated.find((item) => item.side === "right")?.id ?? "" : current);
      setNotice("Reading deleted from this device.");
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : "The reading could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="palmistry-page">
    <header className="palmistry-header">
      <a className="palmistry-brand" href="/" aria-label="LIFE home">✳ <span>LIFE</span></a>
      <Link className="palmistry-dashboard-link" href="/dashboard">Dashboard</Link>
      <span className={`palmistry-connectivity ${online ? "is-online" : "is-offline"}`}><i aria-hidden="true" />{online ? "LOCAL TOOLS READY" : "OFFLINE · LOCAL TOOLS READY"}</span>
    </header>
    <div className="palmistry-content">
      <div className="palmistry-title">
        <p className="palmistry-eyebrow">PALMISTRY · PRIVATE BY DESIGN</p>
        <h1>A reading made by <em>your observations.</em></h1>
          <p>Describe the palm yourself. Reports, local search and Q&amp;A use deterministic rules and bundled content. Saved readings stay in this browser.</p>
      </div>

      <div className="palmistry-assurance" role="note">
        <strong>AI-free and offline-first</strong>
        <span>Photos are for reference only and are never analyzed. Saved observations and optional photos stay in this browser.</span>
      </div>
      {offlineShellStatus === "installing" && <p className="palmistry-status" role="status">Preparing this page for offline use…</p>}
      {offlineShellStatus === "ready" && <p className="palmistry-offline-note" role="status">Palmistry app assets can be reused offline. Sign-in is required to open this protected service; saved reading history stays on this device.</p>}
      {offlineShellStatus === "unavailable" && <p className="palmistry-status" role="note">Offline asset caching is unavailable in this browser. Palmistry rules still run locally while this authenticated page is open.</p>}

      {!storageReady && <p className="palmistry-status" role="status">Opening local reading history…</p>}
      {error && <p className="palmistry-message is-error" role="alert">{error}</p>}
      {notice && <p className="palmistry-message" role="status">{notice}</p>}

      <nav className="palmistry-tabs" aria-label="Palmistry workspace">
        {([
          ["reading", "New reading"],
          ["compare", "Compare palms"],
          ["history", "Saved history"],
          ["knowledge", "Offline guide"],
        ] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => { setTab(id); setError(""); setNotice(""); }}>{label}</button>)}
      </nav>

      {tab === "reading" && <section className="palmistry-panel" aria-labelledby="new-reading-title">
        <div className="palmistry-panel-heading">
          <div><p className="palmistry-eyebrow">01 / OBSERVE</p><h2 id="new-reading-title">Record a palm</h2></div>
          <label className="palmistry-side-picker">PALM
            <select value={side} onChange={(event) => setSide(event.target.value as PalmSide)}>
              {PALM_SIDES.map((option) => <option value={option} key={option}>{labelPalmSide(option)}</option>)}
            </select>
          </label>
        </div>
        <div className="palmistry-form-grid">
          <label className="palmistry-field">Reading name <span>Optional</span>
            <input maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. First observation" />
          </label>
          <label className="palmistry-field">Palm photo <span>Optional · max 3 MB</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} />
          </label>
          <label className="palmistry-field">Dominant hand
            <select value={draft.dominantHand ?? "unknown"} onChange={(event) => setDraft((current) => ({ ...current, dominantHand: event.target.value as PalmDraft["dominantHand"] }))}>
              <option value="unknown">Not specified</option><option value="left">Left</option><option value="right">Right</option>
            </select>
          </label>
          <label className="palmistry-field">Overall observation confidence
            <select value={draft.observationConfidence ?? "medium"} onChange={(event) => setDraft((current) => ({ ...current, observationConfidence: event.target.value as PalmDraft["observationConfidence"] }))}>
              <option value="low">Low · difficult to see</option><option value="medium">Medium · reasonably clear</option><option value="high">High · clearly visible</option>
            </select>
          </label>
        </div>
        {imageDataUrl && <div className="palmistry-photo-preview">
          <img src={imageDataUrl} alt="Your manually selected palm photo preview" />
          <div><strong>Preview only · never analyzed</strong><p>This photo stays in this browser and is only saved if you save the reading.</p>
            <details className="palmistry-photo-zoom"><summary>Open larger photo view</summary><img src={imageDataUrl} alt="Larger local preview of the selected palm photo" /></details>
            <button type="button" className="palmistry-text-button" onClick={() => setImageDataUrl(null)}>Remove photo</button></div>
        </div>}

        <fieldset className="palmistry-fieldset">
          <legend>Hand and finger observations</legend>
          <div className="palmistry-observation-grid">
            <label className="palmistry-field">Palm shape
              <select value={draft.handShape} onChange={(event) => setDraft((current) => ({ ...current, handShape: event.target.value as HandShape | "" }))}>
                <option value="">Select an observation</option>{HAND_SHAPES.map((value) => <option key={value} value={value}>{optionLabel(value)}</option>)}
              </select>
            </label>
            <label className="palmistry-field">Finger length
              <select value={draft.fingerLength} onChange={(event) => setDraft((current) => ({ ...current, fingerLength: event.target.value as FingerLength | "" }))}>
                <option value="">Select an observation</option>{FINGER_LENGTHS.map((value) => <option key={value} value={value}>{optionLabel(value)}</option>)}
              </select>
            </label>
            <label className="palmistry-field">Thumb
              <select value={draft.thumb} onChange={(event) => setDraft((current) => ({ ...current, thumb: event.target.value as ThumbType | "" }))}>
                <option value="">Select an observation</option>{THUMB_TYPES.map((value) => <option key={value} value={value}>{optionLabel(value)}</option>)}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="palmistry-fieldset">
          <legend>Palm line observations</legend>
          <div className="palmistry-observation-grid">
            {LINE_NAMES.map((line) => <label className="palmistry-field" key={line}>{lineLabels[line]}
              <select value={draft.lines[line]} onChange={(event) => updateLine(line, event.target.value as LineQuality)}>
                {LINE_QUALITIES.map((value) => <option key={value} value={value}>{optionLabel(value)}</option>)}
              </select>
            </label>)}
          </div>
        </fieldset>

        <fieldset className="palmistry-fieldset">
          <legend>Mount observations</legend>
          <div className="palmistry-observation-grid">
            {MOUNT_NAMES.map((mount) => <label className="palmistry-field" key={mount}>{mountLabels[mount]}
              <select value={draft.mounts[mount]} onChange={(event) => updateMount(mount, event.target.value as MountLevel)}>
                {MOUNT_LEVELS.map((value) => <option key={value} value={value}>{optionLabel(value)}</option>)}
              </select>
            </label>)}
          </div>
        </fieldset>

        <fieldset className="palmistry-fieldset palmistry-feature-fieldset">
          <legend>Detailed manual observations</legend>
          <p className="palmistry-intro">Choose each feature yourself. Unassessed features receive no interpretation; confidence is your estimate of what you can see, not predictive accuracy.</p>
          <div className="palmistry-completeness" role="status">
            <div><b>Core observations</b><span>{coreObservationCount} / 15 selected</span></div>
            <div><b>Detailed feature notes</b><span>{observedFeatureCount} / {PALM_FEATURE_DEFINITIONS.length} marked</span></div>
          </div>
          <div className="palmistry-feature-layout">
            <figure className="palmistry-hand-map">
              <svg viewBox="0 0 230 245" role="img" aria-labelledby="palm-map-title palm-map-description">
                <title id="palm-map-title">Manual palm feature map</title>
                <desc id="palm-map-description">Select a major line or mount to open its observation controls. This diagram does not analyze a photo.</desc>
                <path className="palmistry-hand-outline" d="M75 219 C66 200 60 178 54 154 L35 102 C31 91 37 81 45 84 C52 87 62 110 69 125 L57 53 C55 42 61 36 68 39 C75 42 80 67 85 91 L80 29 C79 18 86 13 93 17 C100 21 102 53 105 85 L108 20 C109 9 117 6 124 11 C131 17 130 50 130 85 L140 34 C143 23 151 21 157 27 C163 34 154 70 150 94 C158 83 170 73 177 77 C185 82 177 98 169 111 L165 157 C164 183 153 204 143 219 Z" />
                {diagramLines.map((line) => <g key={line.id} role="button" tabIndex={0} aria-label={`Select ${line.label} at ${PALM_FEATURE_DEFINITIONS.find((feature) => feature.id === line.id)?.location}`} aria-pressed={activeFeatureId === line.id} onClick={() => setActiveFeatureId(line.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActiveFeatureId(line.id); } }}>
                  <path className={`palmistry-map-line${activeFeatureId === line.id ? " is-active" : ""}`} d={line.path} />
                </g>)}
                {diagramMounts.map((mount) => <g key={mount.id} role="button" tabIndex={0} aria-label={`Select ${mount.label} mount`} aria-pressed={activeFeatureId === mount.id} onClick={() => setActiveFeatureId(mount.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActiveFeatureId(mount.id); } }}>
                  <circle className={`palmistry-map-mount${activeFeatureId === mount.id ? " is-active" : ""}`} cx={mount.x} cy={mount.y} r="5" />
                </g>)}
              </svg>
              <figcaption>Select a line or mount on the map, or choose any feature below.</figcaption>
            </figure>
            <div className="palmistry-feature-controls">
              <label className="palmistry-field">Feature
                <select value={activeFeatureId} onChange={(event) => setActiveFeatureId(event.target.value as PalmFeatureId)}>
                  {PALM_FEATURE_DEFINITIONS.map((feature) => <option key={feature.id} value={feature.id}>{feature.label} · {feature.category}</option>)}
                </select>
              </label>
              {activeFeature && <div className="palmistry-feature-location"><b>Location</b><span>{activeFeature.location}</span><small>{activeFeature.variations.join(" · ")}</small></div>}
              <label className="palmistry-field">Presence
                <select value={activeFeatureObservation.presence} onChange={(event) => updateFeature("presence", event.target.value as PalmFeatureObservation["presence"])}>
                  {PALM_OBSERVATION_OPTIONS.presence.map((value) => <option key={value} value={value}>{optionLabel(value)}</option>)}
                </select>
              </label>
              <div className="palmistry-observation-grid palmistry-detailed-fields">
                {([
                  ["shape", PALM_OBSERVATION_OPTIONS.shape],
                  ["depth", PALM_OBSERVATION_OPTIONS.depth],
                  ["length", PALM_OBSERVATION_OPTIONS.length],
                  ["direction", PALM_OBSERVATION_OPTIONS.direction],
                  ["continuity", PALM_OBSERVATION_OPTIONS.continuity],
                ] as const).map(([field, options]) => <label className="palmistry-field" key={field}>{optionLabel(field)}
                  <select disabled={activeFeatureObservation.presence === "absent" || activeFeatureObservation.presence === "not-assessed"} value={activeFeatureObservation[field]} onChange={(event) => updateFeature(field, event.target.value)}>
                    {options.map((value) => <option key={value} value={value}>{optionLabel(value)}</option>)}
                  </select>
                </label>)}
                <label className="palmistry-field">Visual confidence
                  <select value={activeFeatureObservation.confidence} onChange={(event) => updateFeature("confidence", event.target.value as PalmFeatureObservation["confidence"])}>
                    {PALM_OBSERVATION_OPTIONS.confidence.map((value) => <option key={value} value={value}>{optionLabel(value)}</option>)}
                  </select>
                </label>
              </div>
              <label className="palmistry-field">Variation or location note <span>Optional · manual only</span>
                <input maxLength={120} value={activeFeatureObservation.variation} onChange={(event) => updateFeature("variation", event.target.value)} placeholder="Describe only what you can see" />
              </label>
            </div>
          </div>
        </fieldset>

        <section className="palmistry-report-preview" id="palmistry-current-report" aria-live="polite" aria-labelledby="report-preview-title">
          <div className="palmistry-panel-heading"><div><p className="palmistry-eyebrow">02 / RULE-BASED REPORT</p><h2 id="report-preview-title">{report?.title ?? "Select your observations"}</h2></div>
            <label className="palmistry-language-picker">Report language
              <select value={reportLanguage} onChange={(event) => setReportLanguage(event.target.value as PalmLanguage)}><option value="en">English</option><option value="hi">हिन्दी</option></select>
            </label>
            <span className="palmistry-rule-badge">DETERMINISTIC · LOCAL</span></div>
          {report ? <>
            <p className="palmistry-report-summary">{report.summary}</p>
            <p className="palmistry-disclaimer">{report.confidenceNotice} Rule weights document engine priorities only, not scientifically validated accuracy.</p>
            {observationIssues.length > 0 && <div className="palmistry-observation-warning" role="alert"><b>Review conflicting entries</b><ul>{observationIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}
            <div className="palmistry-report-sections">{report.sections.map((section) => <article key={section.knowledgeId}>
              <p>{section.category} · <strong>{section.observation}</strong></p>
              {section.futureOriented && <small>{report.language === "hi" ? "पारंपरिक मान्यता; सत्यापित भविष्यवाणी नहीं।" : "Traditional belief; not a verified prediction."}</small>}
              <span>{section.interpretation}</span>
              {section.evidence?.length ? <small>Observation confidence: {section.evidence.map((item) => `${item.featureId} ${item.confidence ?? "unrated"}`).join(" · ")}. Rule weights are not accuracy scores.</small> : null}
              {section.sources?.length ? <small>References: {section.sources.map((sourceId) => PALM_SOURCES.find((source) => source.id === sourceId)?.title ?? sourceId).join("; ")}</small> : null}
            </article>)}</div>
            <p className="palmistry-disclaimer">{report.disclaimer}</p>
            <p className="report-export-note">Use the browser print dialog and choose Save as PDF. Report printing runs locally on this device.</p>
            <button className="palmistry-primary-button" type="button" onClick={() => void saveReading()} disabled={busy || !storageReady}>
              {busy ? "Saving locally…" : "Save reading on this device"} <span aria-hidden="true">↗</span>
            </button>
            <button className="report-print-control palmistry-print-button" type="button" onClick={() => printReport("palmistry-current-report")}>Print / save as PDF</button>
          </> : <p className="palmistry-empty">Choose a palm shape, finger length and thumb observation to create the report. Other line and mount observations are optional.</p>}
        </section>
      </section>}

      {tab === "compare" && <section className="palmistry-panel" aria-labelledby="compare-title">
        <div className="palmistry-panel-heading"><div><p className="palmistry-eyebrow">03 / SIDE BY SIDE</p><h2 id="compare-title">Compare left and right palms</h2></div></div>
        <p className="palmistry-intro">Comparison uses only the observations you selected for saved readings; it does not infer a dominant hand or add new interpretations.</p>
        <div className="palmistry-compare-pickers">
          <label className="palmistry-field">Saved left-palm reading
            <select value={leftReadingId} onChange={(event) => setLeftReadingId(event.target.value)}>
              <option value="">Choose a left palm</option>{readings.filter((item) => item.side === "left").map((item) => <option key={item.id} value={item.id}>{item.title} · {formatDate(item.createdAt)}</option>)}
            </select>
          </label>
          <label className="palmistry-field">Saved right-palm reading
            <select value={rightReadingId} onChange={(event) => setRightReadingId(event.target.value)}>
              <option value="">Choose a right palm</option>{readings.filter((item) => item.side === "right").map((item) => <option key={item.id} value={item.id}>{item.title} · {formatDate(item.createdAt)}</option>)}
            </select>
          </label>
        </div>
        {!leftReading || !rightReading ? <p className="palmistry-empty">Save at least one reading for each hand to compare them here.</p> : <div className="palmistry-comparison">
          <div className="palmistry-comparison-head"><strong>{leftReading.title}</strong><span>vs.</span><strong>{rightReading.title}</strong></div>
          {differences?.length ? differences.map((item) => <div className="palmistry-difference" key={item.label}><b>{item.label}</b><span>{item.leftObservation}</span><span>{item.rightObservation}</span></div>)
            : <p className="palmistry-empty">The recorded observations match for both palms.</p>}
          <p className="palmistry-disclaimer">This is a descriptive comparison of your entries, not a prediction or scientific assessment.</p>
        </div>}
      </section>}

      {tab === "history" && <section className="palmistry-panel" aria-labelledby="history-title">
        <div className="palmistry-panel-heading"><div><p className="palmistry-eyebrow">04 / THIS DEVICE ONLY</p><h2 id="history-title">Saved reading history</h2></div><span className="palmistry-count">{readings.length} / 50</span></div>
        {!readings.length ? <p className="palmistry-empty">No saved readings on this device yet. Create a reading to build your local history.</p> : <div className="palmistry-history-layout">
          <div className="palmistry-history-list" aria-label="Saved readings">
            {readings.map((reading) => <button className="palmistry-history-item" type="button" key={reading.id} aria-pressed={selectedReadingId === reading.id} onClick={() => setSelectedReadingId(reading.id)}>
              <span>{labelPalmSide(reading.side)}</span><strong>{reading.title}</strong><small>{formatDate(reading.createdAt)}</small>
            </button>)}
          </div>
          {selectedReading && <article className="palmistry-saved-report" id="palmistry-saved-report">
            <div className="palmistry-panel-heading"><div><p className="palmistry-eyebrow">{labelPalmSide(selectedReading.side)} · SAVED</p><h3>{selectedReading.title}</h3></div>
              <div><button className="report-print-control" type="button" onClick={() => printReport("palmistry-saved-report")}>Print / save as PDF</button>
                <button className="palmistry-text-button is-danger" type="button" disabled={busy} onClick={() => void removeReading(selectedReading)}>Delete</button></div></div>
            {selectedReading.imageDataUrl && <details className="palmistry-photo-zoom"><summary>Open saved photo preview</summary><img className="palmistry-saved-photo" src={selectedReading.imageDataUrl} alt={`Saved palm photo for ${selectedReading.title}`} /></details>}
            <button type="button" className="palmistry-text-button" disabled={busy} onClick={() => editSavedReading(selectedReading)}>Edit these observations</button>
            <p>{selectedReading.report.summary}</p>
            {selectedReading.report.sections.map((section) => <article className="palmistry-saved-section" key={section.knowledgeId}><strong>{section.observation}</strong><p>{section.interpretation}</p></article>)}
            <p className="palmistry-disclaimer">{selectedReading.report.disclaimer}</p>
            <p className="report-export-note">Use the browser print dialog and choose Save as PDF. Report printing runs locally on this device.</p>
          </article>}
        </div>}
      </section>}

      {tab === "knowledge" && <section className="palmistry-panel" aria-labelledby="knowledge-title">
        <div className="palmistry-panel-heading"><div><p className="palmistry-eyebrow">05 / BUNDLED REFERENCE</p><h2 id="knowledge-title">Search the offline guide</h2></div><span className="palmistry-count">{PALM_KNOWLEDGE.length} entries</span></div>
        <form className="palmistry-qa" onSubmit={(event) => {
          event.preventDefault();
          setError("");
          setQuestionAttempted(true);
          try {
            setQuestionAnswer(answerPalmQuestion(question, reportLanguage));
          } catch (questionError: unknown) {
            setQuestionAnswer(null);
            setError(questionError instanceof Error ? questionError.message : "The local question could not be answered.");
          }
        }}>
          <label className="palmistry-field">Ask a palmistry question · answered from local reference text
            <input maxLength={240} value={question} onChange={(event) => { setQuestion(event.target.value); setQuestionAnswer(null); setQuestionAttempted(false); }} placeholder="What does a broken heart line traditionally mean?" />
          </label>
          <button className="palmistry-primary-button" type="submit">Find a local answer</button>
        </form>
        {questionAnswer && <article className="palmistry-local-answer" aria-live="polite">
          <p className="palmistry-eyebrow">LOCAL REFERENCE ANSWER · NO MODEL</p>
          {questionAnswer.answer.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <span>Sources: {questionAnswer.sources.map((entry) => entry.label).join("; ")}</span>
          <p className="palmistry-disclaimer">{questionAnswer.disclaimer}</p>
        </article>}
        {!questionAnswer && questionAttempted && !error && <p className="palmistry-empty">No bundled passage matched that question. Try a palm feature such as “heart line”, “thumb” or “Venus”.</p>}
        <label className="palmistry-field palmistry-search">Search lines, mounts, shapes or terms
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “heart line”, “Venus” or “finger”" />
        </label>
        <div className="palmistry-knowledge-results" aria-live="polite">
          {knowledgeResults.map((entry) => <article key={entry.id}><span>{entry.category}</span><h3>{entry.label}</h3><p>{reportLanguage === "hi" ? entry.contentHi ?? entry.content : entry.content}</p>
            {entry.location && <small>Location: {entry.location}</small>}{entry.alternative && <small>Alternative / limitation: {reportLanguage === "hi" ? entry.alternativeHi ?? entry.alternative : entry.alternative}</small>}
            {entry.sourceIds?.length ? <small>Sources: {entry.sourceIds.map((id) => PALM_SOURCES.find((source) => source.id === id)?.title ?? id).join("; ")}</small> : null}
          </article>)}
          {query.trim() && knowledgeResults.length === 0 && <p className="palmistry-empty">No local reference entries match that search. Try a palm feature or observation label.</p>}
        </div>
        <p className="palmistry-disclaimer">Reference text is bundled with this page and searched locally. Traditional palmistry is a cultural practice, not a validated diagnostic or predictive method.</p>
        <section className="palmistry-source-register" aria-labelledby="source-register-title">
          <div className="palmistry-panel-heading"><div><p className="palmistry-eyebrow">TRANSPARENT ATTRIBUTION</p><h3 id="source-register-title">Source register</h3></div><span className="palmistry-count">{PALM_SOURCES.length} references</span></div>
          <div className="palmistry-source-grid">{PALM_SOURCES.map((source) => {
            const catalogUrl = getApprovedExternalHref(source.url);
            return <article key={source.id}>
              <h4>{source.title}</h4><p><b>Author / attribution:</b> {source.author}</p><p><b>Tradition:</b> {source.tradition}</p>
              <p><b>Subjects:</b> {source.subjects.join(", ")}</p><p><b>Contribution:</b> {source.relevantInterpretation}</p>
              <p><b>Reliability:</b> {source.historicalReliability} for historical descriptions; {source.empiricalReliability}.</p>
              <p><b>Reuse note:</b> {source.reuseBasis}</p><ul>{source.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
              {catalogUrl && <a href={catalogUrl} target="_blank" rel="noopener noreferrer">View catalog record ↗</a>}
            </article>;
          })}</div>
          <h4>Tradition differences kept explicit</h4>
          <ul className="palmistry-difference-notes">{PALM_TRADITION_DIFFERENCES.map((difference) => <li key={difference.id}><b>{difference.title}:</b> {difference.note}</li>)}</ul>
        </section>
      </section>}

      <footer className="palmistry-footer">
        <span>NO AI · NO IMAGE ANALYSIS · LOCAL-ONLY READING HISTORY</span>
        <a href="/privacy-policy">Privacy information ↗</a>
      </footer>
    </div>
  </main>;
}
