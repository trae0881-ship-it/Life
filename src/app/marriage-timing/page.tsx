"use client";

import { useEffect, useState } from "react";
import { isLanguage, type Language } from "@/presentation/language";
import { readLanguagePreference, writeLanguagePreference } from "@/presentation/language-preference";
import { calculateMarriageTiming, marriageTimingSourcesForResult, type MarriageTimingChart, type MarriageTimingResult } from "@/presentation/marriage-timing";
import SourceDetails from "../SourceDetails";
import { hasUsableChartProvenance } from "@/presentation/chart-provenance";
import "./marriage-timing.css";

const text = {
  en: { title: "Marriage timing", intro: "A transparent KP candidate-window analysis using the calculated chart. It does not predict or guarantee a marriage date.", calculate: "Calculate a chart first", back: "Back to Kundli", language: "Language", noChart: "No calculated chart is available in this browser session.", status: "Status", window: "Potential candidate window", multipleWindows: "Multiple separate candidate periods", boundsNote: "The earliest and latest dates are bounds only, not one continuous period.", dasha: "Supporting Dasha / Bhukti / Antara", kp: "KP evidence", conflicts: "Conflicting or weak evidence", method: "How this was calculated", limitations: "Limitations", noWindow: "No defensible future candidate window was found under the implemented rules. No date is shown." },
  hi: { title: "विवाह का संभावित समय", intro: "गणना की गई कुंडली से पारदर्शी KP संभावित-अवधि विश्लेषण। यह विवाह की तारीख की भविष्यवाणी या गारंटी नहीं है।", calculate: "पहले कुंडली की गणना करें", back: "कुंडली पर लौटें", language: "भाषा", noChart: "इस browser session में गणना की गई कुंडली उपलब्ध नहीं है।", status: "स्थिति", window: "संभावित अवधि", multipleWindows: "अलग-अलग संभावित अवधियाँ", boundsNote: "सबसे पहली और सबसे अंतिम तारीख केवल सीमाएँ हैं; यह एक लगातार अवधि नहीं है।", dasha: "समर्थन करने वाली दशा / भुक्ति / अंतरा", kp: "KP प्रमाण", conflicts: "विरोधी या कमजोर प्रमाण", method: "गणना कैसे हुई", limitations: "सीमाएँ", noWindow: "लागू नियमों के तहत कोई विश्वसनीय भविष्य संभावित अवधि नहीं मिली। कोई तारीख नहीं दिखाई गई।" },
  hinglish: { title: "Marriage timing", intro: "Calculated chart se transparent KP candidate-window analysis. Yeh marriage date ki prediction ya guarantee nahi hai.", calculate: "Pehle chart calculate karein", back: "Kundli par wapas", language: "Language", noChart: "Is browser session mein calculated chart available nahi hai.", status: "Status", window: "Potential candidate window", multipleWindows: "Multiple separate candidate periods", boundsNote: "Earliest aur latest dates sirf bounds hain, ek continuous period nahi.", dasha: "Supporting Dasha / Bhukti / Antara", kp: "KP evidence", conflicts: "Conflicting ya weak evidence", method: "Calculation kaise hui", limitations: "Limitations", noWindow: "Implemented rules ke under koi defensible future candidate window nahi mili. Koi date show nahi ki gayi." },
} as const;

function loadChart(): MarriageTimingChart | null {
  try {
    const value = JSON.parse(sessionStorage.getItem("life-current-chart") ?? "null") as Partial<MarriageTimingChart> | null;
    if (!hasUsableChartProvenance(value) || typeof value.input?.timeZone !== "string" || !Array.isArray(value.vimshottariDasha?.mahadashas)) return null;
    return value as MarriageTimingChart;
  } catch {
    return null;
  }
}

export default function MarriageTimingPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [chart, setChart] = useState<MarriageTimingChart | null>(null);
  const [result, setResult] = useState<MarriageTimingResult | null>(null);
  const t = text[language];
  useEffect(() => { const value = readLanguagePreference(window.localStorage); setLanguage(value); setChart(loadChart()); }, []);
  useEffect(() => { if (chart) setResult(calculateMarriageTiming(chart)); }, [chart]);
  function changeLanguage(value: string) { if (!isLanguage(value)) return; setLanguage(value); writeLanguagePreference(window.localStorage, value); }
  return <main className="marriage-shell">
    <header className="marriage-top"><a href="/" className="marriage-brand">✳ LIFE <span>JYOTISH WORKBENCH</span></a><div><label>{t.language}<select value={language} onChange={(event) => changeLanguage(event.target.value)}><option value="en">English</option><option value="hi">हिन्दी</option><option value="hinglish">Hinglish</option></select></label><a href="/">{t.back}</a></div></header>
    <section className="marriage-hero"><small>KP / VIMSHOTTARI</small><h1>{t.title}</h1><p>{t.intro}</p></section>
    {!chart && <section className="marriage-empty"><p>{t.noChart}</p><a href="/">{t.calculate}</a></section>}
    {result && chart && <section className="marriage-content">
      <div className="marriage-status"><span>{t.status}</span><strong>{result.status}</strong></div>
      {result.earliest_date ? result.status === "multiple_windows" ? <div className="marriage-window"><span>{t.multipleWindows}</span><ul>{result.candidate_windows.slice(0, 3).map((window) => <li key={`${window.start}-${window.end}-${window.mahadasha}-${window.bhukti}-${window.antara}`}>{window.start_date} → {window.end_date}</li>)}</ul><p>{t.boundsNote}</p></div> : <div className="marriage-window"><span>{t.window}</span><strong>{result.earliest_date} → {result.latest_date}</strong><p>{result.explanation_en}</p></div> : <div className="marriage-no-window">{t.noWindow}</div>}
      <p className="marriage-explanation">{language === "hi" ? result.explanation_hi : language === "hinglish" ? result.explanation_hinglish : result.explanation_en}</p>
      <section className="marriage-section"><h2>{t.dasha}</h2>{result.supporting_dasha_periods.length ? <ul>{result.supporting_dasha_periods.map((period) => <li key={`${period.start}-${period.antara}`}>{period.mahadasha} / {period.bhukti} / {period.antara}: {period.start} → {period.end}</li>)}</ul> : <p>{t.noWindow}</p>}</section>
      <section className="marriage-section"><h2>{t.kp}</h2><ul>{result.kp_evidence.map((item) => <li key={item}>{item}</li>)}</ul></section>
      {result.contradictory_evidence.length > 0 && <section className="marriage-section"><h2>{t.conflicts}</h2><ul>{result.contradictory_evidence.map((item) => <li key={item}>{item}</li>)}</ul></section>}
      <section className="marriage-section"><h2>{t.method}</h2><ol><li>Read the KP 7th-cusp sub-lord and its calculated significations.</li><li>Identify planets signifying houses 2, 7 and 11 under the configured method.</li><li>Intersect future Mahadasha/Bhukti/Antara periods whose lords meet the stated signification condition.</li></ol></section>
      <section className="marriage-section"><h2>{t.limitations}</h2><ul>{result.limitations.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <SourceDetails sources={marriageTimingSourcesForResult(result)} />
    </section>}
  </main>;
}
