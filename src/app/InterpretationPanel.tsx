"use client";

import { useMemo, useState } from "react";
import { interpretChart } from "@/interpretation/rules";
import { translate, type Language } from "@/presentation/language";
import { resultCopy } from "@/presentation/result-copy";

type Chart = Parameters<typeof interpretChart>[0];

export default function InterpretationPanel({ chart, language }: { chart: Chart; language: Language }) {
  const report = interpretChart(chart);
  const r = (key: Parameters<typeof resultCopy>[1]) => resultCopy(language, key);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const categories = useMemo(() => ["All", ...report.sections.map((section) => section.name)], [report.sections]);
  const visibleSections = selectedCategory === "All"
    ? report.sections
    : report.sections.filter((section) => section.name === selectedCategory);
  const formattedReportDate = new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : language === "hinglish" ? "en-IN" : "en", { dateStyle: "medium" }).format(new Date(report.asOf));
  return <section className="card positions-card interpretation-card" id="predictions">
    <div className="card-head"><div><div className="section-index">{translate(language, "interpretation.index")}</div><h2>{translate(language, "interpretation.title")}</h2></div></div>
    <p className="interpretation-disclaimer">{r("results.interpretationGuide")}</p>
    {report.summary && <div className="interpretation-summary" aria-live="polite">
      <h3>{translate(language, "interpretation.overview")}</h3>
      <p>{report.summary.overview}</p>
    </div>}
    <div className="interpretation-dasha-summary" aria-label={translate(language, "interpretation.title")}>
      <b>{translate(language, "interpretation.asOf")} {formattedReportDate}</b>
      {report.currentDasha
        ? <span>{report.currentDasha.maha} {r("results.mahadasha")}{report.currentDasha.antar ? ` · ${report.currentDasha.antar} ${r("results.antardasha")}` : ""}{report.currentDasha.pratyantar ? ` · ${report.currentDasha.pratyantar} ${r("results.pratyantardasha")}` : ""}</span>
        : <span>{translate(language, "interpretation.noCurrent")}</span>}
    </div>
    <div className="interpretation-filter" role="group" aria-label={translate(language, "interpretation.filter")}>
      {categories.map((category) => <button type="button" key={category} aria-pressed={selectedCategory === category} className={selectedCategory === category ? "selected" : ""} onClick={() => setSelectedCategory(category)}>{category === "All" ? translate(language, "prediction.all") : translate(language, `prediction.${category}`)}</button>)}
    </div>
    <div className="interpretation-grid">{visibleSections.map((section) => <article className="interpretation-section" key={section.name}>
      <h3>{translate(language, `prediction.${section.name}`)}</h3>
      {section.available ? section.interpretations.map((item) => <details key={item.id} className="interpretation-item">
        <summary>{translate(language, "interpretation.readMore")}</summary>
        <p>{r(`results.prediction.${section.name}` as Parameters<typeof resultCopy>[1])}</p>
        {!["Yogas and Doshas", "Planetary strengths"].includes(section.name) && <p>{item.reading}</p>}
      </details>) : <div className="interpretation-unavailable"><p>{r(`results.prediction.${section.name}` as Parameters<typeof resultCopy>[1])}</p><p>{section.unavailableReason ?? translate(language, "interpretation.unavailable")}</p></div>}
    </article>)}</div>
  </section>;
}
