"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createNumerologyReport,
  GRID_LAYOUT,
  NUMEROLOGY_SOURCES,
  analyzeMobileNumber,
  generateMobileCorrectionPatterns,
  calculateNameCorrections,
  calculateMarriageCompatibility,
  calculateCareerProfile,
  analyzeDateRange,
  type NumerologyLanguage,
  type NumerologySystem,
  type LoShuMode,
} from "@/calculation/numerology";
import { createTarotReading, drawTarotCards, TAROT_CARDS, TAROT_SPREADS, TAROT_TOPICS, type TarotCardId, type TarotSpread, type TarotTopic } from "@/calculation/tarot";
import "./astrology-services.css";

type Service = "ank-jyotish" | "tarot";
type SavedReading = { id: string; title: string; payload: Record<string, unknown>; createdAt: string };
type TarotSelection = { id: TarotCardId | ""; reversed: boolean };

async function responseJson(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof body?.error === "string" ? body.error : "Reading storage is temporarily unavailable.");
  return body;
}

export default function AstrologyServiceWorkspace({ service }: { service: Service }) {
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [comparisonName, setComparisonName] = useState("");
  const [numerologySystem, setNumerologySystem] = useState<NumerologySystem>("pythagorean");
  const [loShuMode, setLoShuMode] = useState<LoShuMode>("dob-only");
  const [reportLanguage, setReportLanguage] = useState<NumerologyLanguage>("en");
  const [keepMasterNumbers, setKeepMasterNumbers] = useState(false);
  const [mobileCountryCode, setMobileCountryCode] = useState("91");
  const [mobileNumber, setMobileNumber] = useState("");
  const [preferredNameSpelling, setPreferredNameSpelling] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerDob, setPartnerDob] = useState("");
  const [historicalMode, setHistoricalMode] = useState(false);
  const [historicalYear, setHistoricalYear] = useState("");
  const [historicalMonth, setHistoricalMonth] = useState("");
  const [spread, setSpread] = useState<TarotSpread>("single");
  const [topic, setTopic] = useState<TarotTopic>("general");
  const [selections, setSelections] = useState<TarotSelection[]>([{ id: "", reversed: false }]);
  const [reading, setReading] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<SavedReading[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const requiredCards = spread === "single" ? 1 : 3;
  const ankReport = useMemo(() => {
    if (service !== "ank-jyotish" || !name.trim() || !dateOfBirth) return null;
    try {
      return createNumerologyReport({ name, dateOfBirth, comparisonName, system:numerologySystem, loShuMode, language:reportLanguage, keepMasterNumbers });
    } catch {
      return null;
    }
  }, [service, name, dateOfBirth, comparisonName, numerologySystem, loShuMode, reportLanguage, keepMasterNumbers]);
  const mobileAnalysis = useMemo(() => {
    if (service !== "ank-jyotish" || !mobileNumber || !dateOfBirth) return null;
    try { return analyzeMobileNumber(mobileCountryCode,mobileNumber,dateOfBirth); } catch { return null; }
  }, [service,mobileCountryCode,mobileNumber,dateOfBirth]);
  const mobileSuggestions = useMemo(() => {
    if (!mobileAnalysis || !dateOfBirth) return [];
    try { return generateMobileCorrectionPatterns(mobileCountryCode,mobileNumber,dateOfBirth); } catch { return []; }
  }, [mobileAnalysis,mobileCountryCode,mobileNumber,dateOfBirth]);
  const nameCorrections = useMemo(() => {
    if (!name.trim() || !dateOfBirth) return [];
    try { return calculateNameCorrections(name,dateOfBirth,numerologySystem,preferredNameSpelling); } catch { return []; }
  }, [name,dateOfBirth,numerologySystem,preferredNameSpelling]);
  const marriageReport = useMemo(() => {
    if (!name.trim()||!dateOfBirth||!partnerName.trim()||!partnerDob) return null;
    try { return calculateMarriageCompatibility(name,dateOfBirth,partnerName,partnerDob,numerologySystem); } catch { return null; }
  }, [name,dateOfBirth,partnerName,partnerDob,numerologySystem]);
  const careerReport = useMemo(() => {
    if (!name.trim()||!dateOfBirth) return null;
    try { return calculateCareerProfile(dateOfBirth,name,numerologySystem); } catch { return null; }
  }, [name,dateOfBirth,numerologySystem]);
  const dateReport = useMemo(() => {
    if (!dateOfBirth) return null;
    try {
      return analyzeDateRange(dateOfBirth, Intl.DateTimeFormat().resolvedOptions().timeZone,{
        historical:historicalMode,
        year:historicalYear?Number(historicalYear):undefined,
        month:historicalMonth?Number(historicalMonth):undefined,
      });
    } catch { return null; }
  }, [dateOfBirth,historicalMode,historicalYear,historicalMonth]);
  const dateReportError = useMemo(() => {
    if (!dateOfBirth || !historicalMode) return "";
    try {
      analyzeDateRange(dateOfBirth,Intl.DateTimeFormat().resolvedOptions().timeZone,{
        historical:true,
        year:historicalYear?Number(historicalYear):undefined,
        month:historicalMonth?Number(historicalMonth):undefined,
      });
      return "";
    } catch (dateError) {
      return dateError instanceof Error ? dateError.message : "Invalid historical date.";
    }
  }, [dateOfBirth,historicalMode,historicalYear,historicalMonth]);
  const tarotReport = useMemo(() => {
    if (service !== "tarot" || selections.length !== requiredCards || selections.some((card) => !card.id)) return null;
    try {
      return createTarotReading({
        spread,
        topic,
        cards: selections.map((card) => ({ id: card.id as TarotCardId, reversed: card.reversed })),
      });
    } catch {
      return null;
    }
  }, [service, selections, requiredCards, spread, topic]);
  const report = service === "ank-jyotish" ? ankReport : tarotReport;

  useEffect(() => {
    let active = true;
    setLoadingHistory(true);
    void fetch(`/api/astrology-readings?service=${service}`, { cache: "no-store" }).then(responseJson).then((body) => {
      if (active && Array.isArray(body.readings)) setHistory(body.readings as SavedReading[]);
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Could not load your reading history.");
    }).finally(() => { if (active) setLoadingHistory(false); });
    return () => { active = false; };
  }, [service]);

  function updateSpread(value: TarotSpread) {
    setSpread(value);
    setSelections(Array.from({ length: value === "single" ? 1 : 3 }, () => ({ id: "", reversed: false })));
    setReading(null);
  }

  function drawCards() {
    try {
      setSelections(drawTarotCards(requiredCards));
      setError("");
      setNotice("");
      setReading(null);
    } catch (drawError: unknown) {
      setError(drawError instanceof Error ? drawError.message : "Cards could not be drawn.");
    }
  }

  async function saveReport() {
    if (!report) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = await responseJson(await fetch("/api/astrology-readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, title: report.title, payload: report }),
      }));
      setHistory((current) => [body.reading as SavedReading, ...current].slice(0, 50));
      setReading(report);
      setNotice("Report saved to your account.");
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Report could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteReport(id: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await responseJson(await fetch(`/api/astrology-readings/${encodeURIComponent(id)}`, { method: "DELETE" }));
      setHistory((current) => current.filter((entry) => entry.id !== id));
      setNotice("Report deleted from your account.");
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : "Report could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  const title = service === "ank-jyotish" ? "Ank Jyotish" : "Tarot Card Reading";
  const icon = service === "ank-jyotish" ? "१" : "✧";

  return <main className="service-workspace">
    <header className="service-header">
      <a href="/dashboard" className="service-brand"><span aria-hidden="true">✳</span> LIFE <small>USER DASHBOARD</small></a>
      <nav aria-label="Astrology service navigation">
        <a href="/dashboard">Dashboard</a><a href="/palmistry">Palmistry</a><a href="/kp-astrology">KP Astrology</a><a href="/ank-jyotish">Ank Jyotish</a><a href="/tarot-reading">Tarot</a>
      </nav>
    </header>
    <div className="service-content">
      <div className="service-hero">
        <span className="service-icon" aria-hidden="true">{icon}</span>
        <div><p className="service-eyebrow">PERSONAL ASTROLOGY SERVICE · RULE-BASED · NO AI</p><h1>{title}</h1>
          <p>{service === "ank-jyotish"
            ? "Explore traditional name and date numerology using a documented, deterministic letter-and-number mapping."
            : "Select cards and orientations for a reflective reading from a bundled local Tarot knowledge base."}</p></div>
      </div>
      <div className="service-shortcuts" aria-label="Switch astrology service">
        <a href="/palmistry">♧ <span>Palmistry</span></a><a href="/kp-astrology">⌖ <span>KP Astrology</span></a><a href="/ank-jyotish">१ <span>Ank Jyotish</span></a><a href="/tarot-reading">✧ <span>Tarot</span></a>
      </div>
      {error && <p className="service-alert" role="alert">{error}</p>}
      {notice && <p className="service-notice" role="status">{notice}</p>}

      {service === "ank-jyotish" && <section className="service-panel" aria-labelledby="ank-form-title">
        <div className="service-panel-heading"><div><p className="service-eyebrow">01 / YOUR DETAILS</p><h2 id="ank-form-title">Create your numerology report</h2></div></div>
        <div className="service-form-grid">
          <label>Full name <input autoComplete="name" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter an Indian or Latin name" /></label>
          <label>Date of birth <input type="text" inputMode="numeric" maxLength={10} value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} placeholder="DD-MM-YYYY" /></label>
          <label>Name system <select value={numerologySystem} onChange={(event) => setNumerologySystem(event.target.value as NumerologySystem)}><option value="pythagorean">Pythagorean</option><option value="chaldean">Chaldean</option></select></label>
          <label>Lo Shu grid mode <select value={loShuMode} onChange={(event) => setLoShuMode(event.target.value as LoShuMode)}><option value="dob-only">Traditional DOB-only</option><option value="indian-extended">Indian extended (Moolank + Bhagyank)</option></select></label>
          <label>Report language <select value={reportLanguage} onChange={(event) => setReportLanguage(event.target.value as NumerologyLanguage)}><option value="en">English</option><option value="hi">हिन्दी</option></select></label>
          <label>Master numbers <select value={keepMasterNumbers ? "keep" : "reduce"} onChange={(event) => setKeepMasterNumbers(event.target.value === "keep")}><option value="reduce">Reduce 11/22/33 normally</option><option value="keep">Keep 11/22/33 when applicable</option></select></label>
          <label className="service-form-wide">Compare name (optional) <input maxLength={100} value={comparisonName} onChange={(event) => setComparisonName(event.target.value)} placeholder="Name compatibility uses number comparison, not a score" /></label>
          <label>Country code <input maxLength={4} value={mobileCountryCode} onChange={(event)=>setMobileCountryCode(event.target.value)} placeholder="91" /></label>
          <label>Current mobile number <input inputMode="numeric" maxLength={15} value={mobileNumber} onChange={(event)=>setMobileNumber(event.target.value.replace(/\D/g,""))} placeholder="National number without spaces" /></label>
          <label>Preferred name spelling <input maxLength={100} value={preferredNameSpelling} onChange={(event)=>setPreferredNameSpelling(event.target.value)} placeholder="Optional spelling to compare" /></label>
          <label>Partner name <input maxLength={100} value={partnerName} onChange={(event)=>setPartnerName(event.target.value)} placeholder="Optional for marriage analysis" /></label>
          <label>Partner date of birth <input maxLength={10} value={partnerDob} onChange={(event)=>setPartnerDob(event.target.value)} placeholder="DD-MM-YYYY" /></label>
          <label>Historical analysis <select value={historicalMode?"historical":"current"} onChange={(event)=>setHistoricalMode(event.target.value==="historical")}><option value="current">Current year/month</option><option value="historical">Historical year/month</option></select></label>
          {historicalMode && <>
            <label>Historical year <input type="number" min={dateOfBirth?dateOfBirth.slice(-4):1800} value={historicalYear} onChange={(event)=>setHistoricalYear(event.target.value)} /></label>
            <label>Historical month <input type="number" min="1" max="12" value={historicalMonth} onChange={(event)=>setHistoricalMonth(event.target.value)} /></label>
          </>}
          {dateReportError && <p className="service-alert" role="alert">{dateReportError}</p>}
        </div>
        {!ankReport && <p className="service-empty">Enter a valid name and date of birth to generate the report. Names currently support Latin alphabet characters.</p>}
        {ankReport && <section className="service-report" aria-live="polite">
          <div className="service-panel-heading"><div><p className="service-eyebrow">02 / DETERMINISTIC REPORT</p><h2>{ankReport.title}</h2></div><span className="service-chip">{numerologySystem.toUpperCase()} MAPPING</span></div>
          <div className="service-number-grid"><div><span>Moolank</span><strong>{ankReport.date.moolank}</strong></div><div><span>Bhagyank</span><strong>{ankReport.date.bhagyank}</strong></div><div><span>Name number</span><strong>{ankReport.nameAnalysis.expression.reduced}</strong></div></div>
          <details className="service-calculation-breakdown">
            <summary>View exact name calculation</summary>
            <p><b>{ankReport.system === "chaldean" ? "Chaldean" : "Pythagorean"} mapping:</b> {Object.entries(ankReport.nameAnalysis.mapping).map(([letter,value])=>`${letter}=${value}`).join(" · ")}</p>
            <p><b>Expression breakdown:</b> {ankReport.nameAnalysis.breakdown.map((item)=>`${item.letter}=${item.value}`).join(" + ")} = {ankReport.nameAnalysis.expression.compound} → {ankReport.nameAnalysis.expression.reduced}</p>
            <p><b>Soul Urge (vowels):</b> {ankReport.nameAnalysis.vowelLetters.join(", ") || "None"} = {ankReport.nameAnalysis.soulUrge.compound} → {ankReport.nameAnalysis.soulUrge.reduced}</p>
          </details>
          <div className="loshu-layout">
            <div className="loshu-grid" aria-label="Lo Shu 3 by 3 grid">
              {GRID_LAYOUT.flat().map((number) => <div className={ankReport.grid.frequency[number] ? "is-present" : "is-missing"} key={number}><strong>{number}</strong><span>{ankReport.grid.frequency[number] ? `×${ankReport.grid.frequency[number]}` : "Missing"}</span></div>)}
            </div>
            <div className="loshu-summary">
              <b>Present</b><span>{ankReport.grid.present.join(", ")}</span>
              <b>Missing</b><span>{ankReport.grid.missing.join(", ") || "None"}</span>
              <b>Repeated</b><span>{ankReport.grid.repeated.map((item) => `${item.number}×${item.count}`).join(", ") || "None"}</span>
            </div>
          </div>
          <div className="service-plane-grid">{ankReport.grid.planes.map((plane) => <article key={plane.id}><span>{reportLanguage==="hi"?plane.labelHi:plane.label}</span><strong>{plane.numbers.join(" · ")}</strong><small>{plane.status} · {plane.strength}</small></article>)}</div>
          <details className="service-calculation-breakdown">
            <summary>Pinnacles and Challenges</summary>
            <p><b>Pinnacles:</b> {ankReport.pinnacles.map((item) => `P${item.index} ${item.reduced} (compound ${item.compound}, ages ${item.fromAge}-${item.toAge})`).join(" · ")}</p>
            <p><b>Challenges:</b> {ankReport.challenges.map((item) => `C${item.index} ${item.reduced} (compound ${item.compound}, ages ${item.fromAge}-${item.toAge})`).join(" · ")}</p>
          </details>
          <details className="service-calculation-breakdown">
            <summary>Source register and tradition differences</summary>
            {NUMEROLOGY_SOURCES.map((source) => <p key={source.id}><b>{source.title}</b> — {source.tradition}. {source.basis}</p>)}
            <p><b>Grid method:</b> DOB-only and Indian extended grids are deliberately separate. Moolank/Bhagyank are not silently added to DOB-only mode.</p>
            <p><b>Kua is not mixed into Lo Shu:</b> Chinese Ba Zhai/Kua is a separate system and is not placed into these nine Lo Shu cells.</p>
          </details>
          {mobileAnalysis && <details className="service-calculation-breakdown">
            <summary>Mobile Number Analysis</summary>
            <p><b>Full number:</b> {mobileAnalysis.fullNumber} · <b>Compound:</b> {mobileAnalysis.compound} · <b>Root:</b> {mobileAnalysis.root}</p>
            <p><b>Repeated digits:</b> {mobileAnalysis.repeated.map((item)=>`${item.digit}×${item.count}`).join(", ")||"None"} · <b>Missing digits:</b> {mobileAnalysis.missing.join(", ")||"None"}</p>
            <p><b>Patterns:</b> {mobileAnalysis.patterns.join("; ")||"No simple documented pattern detected"}</p>
            {(mobileAnalysis as unknown as {dobCompatibility?:Record<string,unknown>}).dobCompatibility && <p><b>DOB compatibility:</b> {JSON.stringify((mobileAnalysis as unknown as {dobCompatibility:unknown}).dobCompatibility)}</p>}
          </details>}
          {mobileSuggestions.length>0 && <details className="service-calculation-breakdown">
            <summary>Mobile Number Correction Patterns</summary>
            {mobileSuggestions.map((item,index)=><p key={`${item.example}-${index}`}><b>{item.pattern}</b> — Example pattern: {item.example} · Score: {item.score}/95 · {item.rationale} · Compound change: {item.compoundDelta >= 0 ? "+" : ""}{item.compoundDelta}</p>)}
            <p><b>Limitation:</b> These are numerical patterns only. LIFE does not determine telephone availability or fabricate real assignable numbers.</p>
          </details>}
          {nameCorrections.length>0 && <details className="service-calculation-breakdown">
            <summary>Name Correction Suggestions</summary>
            {nameCorrections.map((item,index)=><p key={`${item.suggested}-${index}`}><b>{item.original} → {item.suggested}</b> · Compound {item.originalCompound}→{item.newCompound} · Root {item.originalRoot}→{item.newRoot} · Chaldean {item.chaldean} · Pythagorean {item.pythagorean} · Score {item.score}/90 · {item.rationale}</p>)}
            <p><b>User choice:</b> No spelling is changed automatically. Suggestions are limited to preserve pronounceable, familiar forms.</p>
          </details>}
          {marriageReport && <details className="service-calculation-breakdown">
            <summary>Marriage Compatibility with {partnerName}</summary>
            <p><b>Traditional method score:</b> {marriageReport.traditionalMethodScore}/{marriageReport.maximumScore}. Weights: Moolank {marriageReport.weights.moolank}, Bhagyank {marriageReport.weights.bhagyank}, Name {marriageReport.weights.name}, complementary Lo Shu counts.</p>
            <p><b>Shared missing Lo Shu numbers:</b> {marriageReport.sharedMissing.join(", ")||"None"} · <b>Complementary missing/present counts:</b> {marriageReport.complementary}</p>
            <p>{marriageReport.disclaimer} No marriage date or outcome is inferred.</p>
          </details>}
          {careerReport && <details className="service-calculation-breakdown">
            <summary>Career and Business Analysis</summary>
            {careerReport.categories.map((item)=><p key={item.category}><b>{item.category}:</b> Matching roots {item.match.join(", ")||"none"}; traditional associations {item.associated.join(", ")||"none"}.</p>)}
            <p><b>Practical actions:</b> {careerReport.practicalActions.join(" ")}</p>
            <p>{careerReport.disclaimer}</p>
          </details>}
          {dateReport && <details className="service-calculation-breakdown">
            <summary>{dateReport.historical ? "Historical Year and Month Report" : "Current Year and Month Report"}</summary>
            <p><b>{dateReport.year}-{String(dateReport.month).padStart(2,"0")}</b> · Timezone {dateReport.timezone} · Universal year {dateReport.universalYear} · Personal year {dateReport.personalYear} · Personal month {dateReport.personalMonth}</p>
            <p><b>Valid lifetime range:</b> begins {dateReport.minimum.year}-{String(dateReport.minimum.month).padStart(2,"0")}. Historical dates earlier than DOB are rejected.</p>
          </details>}
          <div className="service-report-grid">{ankReport.sections.map((section) => <article key={section.title}><h3>{reportLanguage==="hi"?section.titleHi:section.title}</h3><b>{section.value}</b><p>{reportLanguage==="hi"?section.interpretationHi:section.interpretation}</p><small>{section.evidence}</small></article>)}</div>
          <p className="service-disclaimer">{ankReport.disclaimer}</p>
          <div className="service-actions">
            <button className="service-primary" type="button" disabled={busy} onClick={() => void saveReport()}>{busy ? "Saving…" : "Save report to my account"} ↗</button>
            <button className="service-secondary" type="button" onClick={() => window.print()}>Print / PDF</button>
            <button className="service-secondary" type="button" onClick={() => {
              const blob = new Blob([JSON.stringify(ankReport,null,2)],{type:"application/json"});
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href=url; anchor.download=`numerology-${ankReport.date.iso}.json`; anchor.click();
              URL.revokeObjectURL(url);
            }}>Export JSON</button>
          </div>
        </section>}
      </section>}

      {service === "tarot" && <section className="service-panel" aria-labelledby="tarot-form-title">
        <div className="service-panel-heading"><div><p className="service-eyebrow">01 / SELECT YOUR SPREAD</p><h2 id="tarot-form-title">Tarot card reading</h2></div><button className="service-secondary" type="button" onClick={drawCards}>Draw {requiredCards} card{requiredCards === 1 ? "" : "s"}</button></div>
        <div className="service-form-grid">
          <label>Spread <select value={spread} onChange={(event) => updateSpread(event.target.value as TarotSpread)}>{TAROT_SPREADS.map((item) => <option value={item} key={item}>{item === "single" ? "Single card" : item === "three-card" ? "Three-card reflection" : "Past, Present, Future"}</option>)}</select></label>
          <label>Reading focus <select value={topic} onChange={(event) => setTopic(event.target.value as TarotTopic)}>{TAROT_TOPICS.map((item) => <option value={item} key={item}>{item === "general" ? "General guidance" : item === "relationship" ? "Relationship reflection" : "Career reflection"}</option>)}</select></label>
        </div>
        <div className="tarot-selection-grid">{selections.map((selection, index) => <article className="tarot-selector" key={`${spread}-${index}`}>
          <span className="service-eyebrow">{spread === "past-present-future" ? ["PAST", "PRESENT", "FUTURE"][index] : spread === "single" ? "GUIDANCE" : ["SITUATION", "REFLECTION", "NEXT STEP"][index]}</span>
          <label>Choose a card <select value={selection.id} onChange={(event) => setSelections((current) => current.map((card, cardIndex) => cardIndex === index ? { ...card, id: event.target.value as TarotCardId | "" } : card))}>
            <option value="">Select a Tarot card</option>{TAROT_CARDS.map((card) => <option key={card.id} value={card.id} disabled={selections.some((other, otherIndex) => otherIndex !== index && other.id === card.id)}>{card.name}</option>)}
          </select></label>
          <label>Orientation <select value={selection.reversed ? "reversed" : "upright"} onChange={(event) => setSelections((current) => current.map((card, cardIndex) => cardIndex === index ? { ...card, reversed: event.target.value === "reversed" } : card))}><option value="upright">Upright</option><option value="reversed">Reversed</option></select></label>
        </article>)}</div>
        {tarotReport && <section className="service-report" aria-live="polite">
          <div className="service-panel-heading"><div><p className="service-eyebrow">02 / BUNDLED CARD MEANINGS</p><h2>{tarotReport.title}</h2></div><span className="service-chip">LOCAL · RULE-BASED</span></div>
          <div className="tarot-reading">{tarotReport.cards.map((card) => <article key={card.id}><span>{card.position} · {card.orientation}</span><h3>{card.name}</h3><p>{card.meaning}</p></article>)}</div>
          <p className="service-disclaimer">{tarotReport.disclaimer}</p><button className="service-primary" type="button" disabled={busy} onClick={() => void saveReport()}>{busy ? "Saving…" : "Save reading to my account"} ↗</button>
        </section>}
      </section>}

      <section className="service-panel service-history" aria-labelledby="service-history-title">
        <div className="service-panel-heading"><div><p className="service-eyebrow">03 / PRIVATE TO YOUR ACCOUNT</p><h2 id="service-history-title">Reading history</h2></div><span className="service-chip">{history.length} / 50</span></div>
        {loadingHistory ? <p role="status">Loading your saved readings…</p> : history.length === 0 ? <p className="service-empty">No saved {title} readings yet. Create and save a report to see it here.</p> : <div className="service-history-list">
          {history.map((item) => <article key={item.id}>
            <div><h3>{item.title}</h3><small>{new Date(item.createdAt).toLocaleString()}</small>
              {service === "ank-jyotish" && Array.isArray(item.payload.sections) && <p>{item.payload.sections.length} interpretation sections</p>}
              {service === "tarot" && Array.isArray(item.payload.cards) && <p>{(item.payload.cards as { name?: string; orientation?: string }[]).map((card) => `${card.name ?? "Card"} · ${card.orientation ?? ""}`).join(" / ")}</p>}
            </div><button className="service-secondary" type="button" disabled={busy} onClick={() => setReading(item.payload)}>Open</button><button className="service-delete" type="button" disabled={busy} onClick={() => void deleteReport(item.id)}>Delete</button>
          </article>)}
        </div>}
        {reading && <article className="service-history-detail"><button className="service-text-button" type="button" onClick={() => setReading(null)}>Close report</button><h3>{String(reading.title ?? "Saved reading")}</h3>
          {Array.isArray(reading.sections) && (reading.sections as { title?: string; value?: string; interpretation?: string }[]).map((section, index) => <p key={`${section.title}-${index}`}><strong>{section.title}: {section.value}</strong> — {section.interpretation}</p>)}
          {Array.isArray(reading.cards) && (reading.cards as { position?: string; name?: string; orientation?: string; meaning?: string }[]).map((card, index) => <p key={`${card.name}-${index}`}><strong>{card.position}: {card.name} ({card.orientation})</strong> — {card.meaning}</p>)}
          {typeof reading.interpretation === "string" && <p>{reading.interpretation}</p>}
          {typeof reading.disclaimer === "string" && <p className="service-disclaimer">{reading.disclaimer}</p>}
        </article>}
      </section>
      <footer className="service-footer"><span>DETERMINISTIC RULES · LOCAL KNOWLEDGE · NO AI PROVIDERS</span><a href="/dashboard">Return to dashboard ↑</a></footer>
    </div>
  </main>;
}
