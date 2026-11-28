"use client";

import { useEffect, useState } from "react";
import { isLanguage, type Language } from "@/presentation/language";
import { readLanguagePreference, writeLanguagePreference } from "@/presentation/language-preference";
import { calculateMarriageTiming, type MarriageTimingChart, type MarriageTimingResult } from "@/presentation/marriage-timing";
import { hasUsableChartProvenance } from "@/presentation/chart-provenance";
import "./marriage-timing.css";

const text = {
  en: { title: "Marriage Analysis", intro: "Explore traditional astrology insights about relationship timing. Any periods shown are for reflection, not guarantees.", calculate: "Create a Kundali first", back: "Back to Kundali", language: "Language", noChart: "Create a Kundali to see its marriage analysis.", window: "Potential period", multipleWindows: "Possible periods", boundsNote: "Each period is shown separately.", dasha: "Related Dasha periods", noWindow: "A personalized timing reading is not available for this Kundali." },
  hi: { title: "विवाह विश्लेषण", intro: "रिश्तों के समय के बारे में पारंपरिक ज्योतिषीय दृष्टिकोण जानें। दिखाई गई अवधियाँ विचार के लिए हैं, गारंटी नहीं।", calculate: "पहले कुंडली बनाएँ", back: "कुंडली पर लौटें", language: "भाषा", noChart: "विवाह विश्लेषण देखने के लिए पहले कुंडली बनाएँ।", window: "संभावित अवधि", multipleWindows: "संभावित अवधियाँ", boundsNote: "हर अवधि अलग दिखाई गई है।", dasha: "संबंधित दशा अवधि", noWindow: "इस कुंडली के लिए व्यक्तिगत समय-विश्लेषण उपलब्ध नहीं है।" },
  hinglish: { title: "Marriage Analysis", intro: "Relationship timing par traditional astrology insights dekhein. Periods reflection ke liye hain, guarantee nahi.", calculate: "Pehle Kundali banayein", back: "Kundali par wapas", language: "Language", noChart: "Marriage analysis dekhne ke liye pehle Kundali banayein.", window: "Potential period", multipleWindows: "Possible periods", boundsNote: "Har period alag dikhaya gaya hai.", dasha: "Related Dasha periods", noWindow: "Is Kundali ke liye personalized timing reading available nahi hai." },
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

function formatDate(value: string, language: Language) {
  const locale = language === "hi" ? "hi-IN" : language === "hinglish" ? "en-IN" : "en";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
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
    <header className="marriage-top"><a href="/" className="marriage-brand">✳ LIFE <span>JYOTISH</span></a><div><label>{t.language}<select value={language} onChange={(event) => changeLanguage(event.target.value)}><option value="en">English</option><option value="hi">हिन्दी</option><option value="hinglish">Hinglish</option></select></label><a href="/">{t.back}</a></div></header>
    <section className="marriage-hero"><small>PERSONALIZED REPORT</small><h1>{t.title}</h1><p>{t.intro}</p></section>
    {!chart && <section className="marriage-empty"><p>{t.noChart}</p><a href="/">{t.calculate}</a></section>}
    {result && chart && <section className="marriage-content">
      {result.earliest_date && result.latest_date ? <div className="marriage-window">
        <span>{result.status === "multiple_windows" ? t.multipleWindows : t.window}</span>
        {result.status === "multiple_windows"
          ? <ul>{result.candidate_windows.slice(0, 3).map((window) => <li key={`${window.start}-${window.end}-${window.mahadasha}-${window.bhukti}-${window.antara}`}>{formatDate(window.start_date, language)} → {formatDate(window.end_date, language)}</li>)}</ul>
          : <strong>{formatDate(result.earliest_date, language)} → {formatDate(result.latest_date, language)}</strong>}
        {result.status === "multiple_windows" && <p>{t.boundsNote}</p>}
      </div> : <div className="marriage-no-window">{t.noWindow}</div>}
      {result.supporting_dasha_periods.length > 0 && <section className="marriage-section"><h2>{t.dasha}</h2><ul>{result.supporting_dasha_periods.map((period) => <li key={`${period.start}-${period.antara}`}>{period.mahadasha} / {period.bhukti} / {period.antara}: {formatDate(period.start, language)} → {formatDate(period.end, language)}</li>)}</ul></section>}
    </section>}
  </main>;
}
