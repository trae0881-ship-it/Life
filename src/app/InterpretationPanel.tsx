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
  return <section className="card positions-card interpretation-card" id="predictions">
    <div className="card-head"><div><div className="section-index">{translate(language, "interpretation.index")}</div><h2>{translate(language, "interpretation.title")}</h2></div><span className="table-count">{report.sections.filter((section) => section.available).length} {translate(language, "interpretation.matched")}</span></div>
    <p className="interpretation-disclaimer">{r("results.interpretationGuide")}</p>
    {report.summary && <div className="interpretation-summary" aria-live="polite">
      <h3>{translate(language, "interpretation.overview")}</h3>
      <p>{report.summary.overview}</p>
      <div className="overview-grid">
        <div><small>{translate(language, "interpretation.strongFactors")}</small><ul>{report.summary.strongFactors.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div><small>{translate(language, "interpretation.cautionAreas")}</small><ul>{report.summary.cautionAreas.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div><small>{translate(language, "interpretation.timingWindows")}</small><ul>{report.summary.timingWindows.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div><small>{translate(language, "interpretation.recommendations")}</small><ul>{report.summary.recommendations.map((item) => <li key={item}>{item}</li>)}</ul></div>
      </div>
      <p className="interpretation-conclusion"><strong>{translate(language, "interpretation.finalConclusion")}</strong> {report.summary.finalConclusion}</p>
    </div>}
    <div className="interpretation-dasha-summary" aria-label={translate(language, "interpretation.title")}>
      <b>{translate(language, "interpretation.asOf")} {report.asOf}</b>
      {report.currentDasha
        ? <span>{report.currentDasha.maha} {r("results.mahadasha")}{report.currentDasha.antar ? ` · ${report.currentDasha.antar} ${r("results.antardasha")}` : ""}{report.currentDasha.pratyantar ? ` · ${report.currentDasha.pratyantar} ${r("results.pratyantardasha")}` : ""}</span>
        : <span>{translate(language, "interpretation.noCurrent")}</span>}
      <small>{translate(language, "interpretation.houseFrameworkOriginal")}: {report.houseFramework}.</small>
    </div>
    <div className="interpretation-filter" role="group" aria-label={translate(language, "interpretation.filter")}>
      {categories.map((category) => <button type="button" key={category} aria-pressed={selectedCategory === category} className={selectedCategory === category ? "selected" : ""} onClick={() => setSelectedCategory(category)}>{category === "All" ? translate(language, "prediction.all") : translate(language, `prediction.${category}`)}</button>)}
    </div>
    <div className="interpretation-grid">{visibleSections.map((section) => <article className="interpretation-section" key={section.name}>
      <h3>{translate(language, `prediction.${section.name}`)}</h3>
      {section.available ? section.interpretations.map((item) => <details key={item.id} className="interpretation-item">
        <summary>{r("results.details")}</summary>
        <p>{r(`results.prediction.${section.name}` as Parameters<typeof resultCopy>[1])}</p>
        <div><b>{r("results.evidenceLabel")}</b><strong>{item.title}</strong></div>
        <div><b>{translate(language, "interpretation.chartFactors")}</b><ul>{item.factors.map((factor) => <li key={factor}>{factor}</li>)}</ul></div>
        <div><b>{translate(language, "interpretation.matchedConditions")}</b><ul>{item.matchedConditions.map((condition) => <li key={condition}>{condition}</li>)}</ul></div>
        <p>{item.reading}</p>
        <small><b>{translate(language, "interpretation.evidence")}:</b> {item.evidenceStrength}. {translate(language, "interpretation.evidenceNote")}</small>
        {item.dashaFactors.length > 0 && <small><b>{translate(language, "interpretation.dashaFactors")}:</b> {item.dashaFactors.join("; ")}</small>}
        {item.transitFactors.length > 0 && <small><b>{translate(language, "interpretation.transitFactors")}:</b> {item.transitFactors.join("; ")}</small>}
        {item.conflicts.length > 0 && <div className="interpretation-conflicts"><b>{translate(language, "interpretation.conflicts")}</b><ul>{item.conflicts.map((conflict) => <li key={conflict}>{conflict}</li>)}</ul></div>}
        <small className="interpretation-limit">{item.limitation}</small>
      </details>) : <div className="interpretation-unavailable"><p>{r(`results.prediction.${section.name}` as Parameters<typeof resultCopy>[1])}</p><p>{section.unavailableReason ?? translate(language, "interpretation.unavailable")}</p></div>}
    </article>)}</div>
  </section>;
}
