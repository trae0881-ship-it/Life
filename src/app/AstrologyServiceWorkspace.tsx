"use client";

import { useEffect, useMemo, useState } from "react";
import { createAnkJyotishReport } from "@/calculation/ank-jyotish";
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
      return createAnkJyotishReport({ name, dateOfBirth, comparisonName });
    } catch {
      return null;
    }
  }, [service, name, dateOfBirth, comparisonName]);
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
          <label>Name <input autoComplete="name" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter name in Latin letters" /></label>
          <label>Date of birth <input type="date" min="1800-01-01" max="2399-12-31" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} /></label>
          <label className="service-form-wide">Compare name (optional) <input maxLength={100} value={comparisonName} onChange={(event) => setComparisonName(event.target.value)} placeholder="Name compatibility uses number comparison, not a score" /></label>
        </div>
        {!ankReport && <p className="service-empty">Enter a valid name and date of birth to generate the report. Names currently support Latin alphabet characters.</p>}
        {ankReport && <section className="service-report" aria-live="polite">
          <div className="service-panel-heading"><div><p className="service-eyebrow">02 / DETERMINISTIC REPORT</p><h2>{ankReport.title}</h2></div><span className="service-chip">PYTHAGOREAN MAPPING</span></div>
          <div className="service-number-grid"><div><span>Birth number</span><strong>{ankReport.birthNumber}</strong></div><div><span>Destiny number</span><strong>{ankReport.destinyNumber}</strong></div><div><span>Name number</span><strong>{ankReport.nameNumber}</strong></div></div>
          <div className="service-report-grid">{ankReport.sections.map((section) => <article key={section.title}><h3>{section.title}</h3><b>{section.value}</b><p>{section.interpretation}</p></article>)}</div>
          <p className="service-disclaimer">{ankReport.disclaimer}</p><button className="service-primary" type="button" disabled={busy} onClick={() => void saveReport()}>{busy ? "Saving…" : "Save report to my account"} ↗</button>
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
