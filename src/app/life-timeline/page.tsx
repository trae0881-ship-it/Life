"use client";

import { useEffect, useMemo, useState } from "react";
import { ageOnDate, buildTimeline, timelineRange, type TimelineView } from "@/calculation/life-timeline";
import { translate, type Language } from "@/presentation/language";
import { readLanguagePreference } from "@/presentation/language-preference";
import "../kundli.css";

export default function LifeTimelinePage() {
  const [language, setLanguage] = useState<Language>("en");
  const [birthDate, setBirthDate] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [view, setView] = useState<TimelineView>("yearly");
  const t = (key: string) => translate(language, key);
  useEffect(() => {
    setLanguage(readLanguagePreference(window.localStorage));
    const requestedDate = new URLSearchParams(window.location.search).get("date") ?? "";
    try {
      if (requestedDate) {
        timelineRange(requestedDate);
        setBirthDate(requestedDate);
        setSelectedDate(requestedDate);
      }
    } catch {
      setBirthDate("");
      setSelectedDate("");
    }
  }, []);
  const range = useMemo(() => {
    try { return birthDate ? timelineRange(birthDate) : null; } catch { return null; }
  }, [birthDate]);
  const selectedDateInRange = Boolean(range && selectedDate >= range.start && selectedDate <= range.end);
  const periods = useMemo(() => {
    try { return birthDate && selectedDateInRange ? buildTimeline(birthDate, view, selectedDate) : []; } catch { return []; }
  }, [birthDate, selectedDate, selectedDateInRange, view]);
  const currentAge = birthDate && selectedDateInRange ? (() => {
    try { return ageOnDate(birthDate, selectedDate); } catch { return null; }
  })() : null;

  return <main className="timeline-page">
    <header className="timeline-header">
      <a href="/" className="timeline-back">LIFE · Jyotish Workbench</a>
      <div className="section-index">{t("timeline.planningView")}</div>
      <h1>{t("timeline.standaloneTitle")}</h1>
      <p>{t("timeline.standaloneIntro")}</p>
    </header>
    <section className="card timeline-card">
      <label className="field-label" htmlFor="timeline-birth-date">{t("timeline.birthRequired")}</label>
      <input id="timeline-birth-date" type="date" value={birthDate} min="1800-01-01" max="2399-12-31" onChange={(event) => { setBirthDate(event.target.value); setSelectedDate(event.target.value); }} />
      <p className="term-note">{t("timeline.standaloneLimit")}</p>
      {range && <div className="timeline-summary"><span>{t("timeline.start")}: {range.start}</span><span>{t("timeline.80thBirthday")}: {range.end}</span>{currentAge !== null && <span>{t("timeline.selectedAge")}: {currentAge}</span>}</div>}
      <div className="timeline-controls">
        <label>{t("timeline.view")} <select value={view} onChange={(event) => setView(event.target.value as TimelineView)}><option value="yearly">{t("timeline.yearly")}</option><option value="monthly">{t("timeline.monthly")}</option><option value="daily">{t("timeline.daily")}</option></select></label>
        <label>{t("timeline.date")} <input type="date" value={selectedDate} min={range?.start} max={range?.end} disabled={!range} onChange={(event) => {
          const nextDate = event.target.value;
          if (range && nextDate >= range.start && nextDate <= range.end) setSelectedDate(nextDate);
        }} /></label>
      </div>
      {!birthDate && <p role="status">{t("timeline.enterBirthDate")}</p>}
      {birthDate && !range && <p role="alert">{t("timeline.invalidBirthDate")}</p>}
      {birthDate && range && selectedDate && !selectedDateInRange && <p role="alert">{t("timeline.dateOutOfRange")}</p>}
      {periods.length > 0 && <div className="timeline-period-list" aria-label={t("timeline.periodAnalysis")}>
        {periods.map((period) => <article className="timeline-period-card" key={`${period.start}-${period.end}`}>
          <div className="timeline-period-heading"><div><strong>{view === "yearly" ? `${t("timeline.age")} ${period.label}` : period.label}</strong><span>{period.start} → {period.end}</span></div>
            <span className="timeline-classification-badge" data-classification="not-evaluated">{t("timeline.classification.not-evaluated")}</span>
          </div>
          <p>{t("timeline.age")}: {period.age}{period.ageAtEnd !== period.age ? `–${period.ageAtEnd}` : ""}</p>
          <details><summary>{t("timeline.why")}</summary><div className="timeline-evidence-details">
            <p>{t("timeline.explanation.incomplete")}</p>
            <p>{t("timeline.standaloneDashaMissing")}</p>
            <p>{t("timeline.transitNotUsed")}</p>
          </div></details>
        </article>)}
      </div>}
    </section>
  </main>;
}
