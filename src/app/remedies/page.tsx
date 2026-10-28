"use client";

import { useEffect, useMemo, useState } from "react";
import { isLanguage, type Language, translate } from "@/presentation/language";
import { readLanguagePreference, writeLanguagePreference } from "@/presentation/language-preference";
import { localized, priceTiers, remedyCatalog, remedyCategories, remedyProblems, sortRemedies, type RemedyCategory, type RemedyProblem } from "@/presentation/remedies";
import { evaluatePersonalizedRemedies, type RemedyChart } from "@/presentation/personalized-remedies";
import "./remedies.css";

const chartStorageKey = "life-current-chart";
type SortOrder = "lowest" | "highest" | "category";

const copy = {
  en: {
    eyebrow: "LIFE / TRADITIONAL PRACTICES", title: "Remedies & Upay", intro: "Browse modest, safe traditional practices and practical alternatives. These are educational and devotional options, not guaranteed interventions.",
    search: "Search remedies", category: "Tradition", problem: "User goal", sort: "Sort", all: "All", lowest: "Lowest price first", highest: "Highest price first", categorySort: "By category",
    chartReady: "A calculated chart is available for contextual evidence.", noChart: "No chart is loaded. You can browse all remedies; recommendations remain general until a chart is calculated.", personalized: "Personalized for your chart", personalizedIntro: "Only reviewed, provenance-gated rules can appear here. General catalog remedies below are separate.", noSupported: "No sufficiently supported chart-specific remedy rule is active for this concern. General practices below are not personalized.", chartUsed: "Chart used", calculation: "Calculation", currentDasha: "Current Dasha", noDasha: "Current Dasha is outside the available horizon.", noRecommendations: "No personalized recommendations.", sourceStatus: "Source status", confidence: "Rule applicability confidence", costStatus: "Cost status", unknownCost: "Cost not verified", guaranteed: "Results are not guaranteed.",
    evidence: "Chart context", free: "Free alternative", purpose: "Intended purpose", tradition: "Tradition / source", materials: "Materials", steps: "Safe steps", duration: "Suggested duration", time: "Time", price: "Configured price", safety: "Safety", evidenceLabel: "Evidence classification", noPrice: "Price not configured", notPersonalized: "No supported chart-specific remedy rule is applied.",
    disclaimer: "Traditional belief is not scientific proof. Never pay because of fear, a guaranteed promise or a claim that you are cursed. Seek qualified medical, legal or financial help when appropriate.",
    basicMantra: "Basic Mantra & Daily Practices", basicMantraIntro: "Optional devotional and reflective practices are listed separately from chart-specific recommendations.", basicMantraSafety: "Choose practices freely and stop if they cause distress. No mantra or devotional practice guarantees a health, relationship, career, financial or other life outcome.",
    navBack: "Back to Kundli", navHome: "Chart workspace", count: "remedies",
  },
  hi: {
    eyebrow: "LIFE / पारंपरिक अभ्यास", title: "उपाय और साधना", intro: "सरल, सुरक्षित पारंपरिक अभ्यास और व्यावहारिक विकल्प देखें। ये शैक्षिक और भक्ति विकल्प हैं, निश्चित परिणाम देने वाले उपाय नहीं।",
    search: "उपाय खोजें", category: "परंपरा", problem: "उद्देश्य", sort: "क्रम", all: "सभी", lowest: "कम कीमत पहले", highest: "अधिक कीमत पहले", categorySort: "श्रेणी के अनुसार",
    chartReady: "संदर्भ के लिए गणना की गई कुंडली उपलब्ध है।", noChart: "कोई कुंडली लोड नहीं है। सभी उपाय देख सकते हैं; कुंडली गणना होने तक सुझाव सामान्य रहेंगे।", personalized: "आपकी कुंडली के लिए व्यक्तिगत सुझाव", personalizedIntro: "यहाँ केवल समीक्षा किए गए और provenance से सत्यापित नियम दिख सकते हैं। नीचे के सामान्य उपाय अलग हैं।", noSupported: "इस उद्देश्य के लिए कुंडली-विशिष्ट पर्याप्त समर्थित नियम सक्रिय नहीं है। नीचे के अभ्यास व्यक्तिगत सुझाव नहीं हैं।", chartUsed: "उपयोग की गई कुंडली", calculation: "गणना", currentDasha: "वर्तमान दशा", noDasha: "उपलब्ध दशा अवधि में वर्तमान समय नहीं है।", noRecommendations: "कोई व्यक्तिगत सुझाव नहीं।", sourceStatus: "स्रोत स्थिति", confidence: "नियम लागू होने का विश्वास", costStatus: "लागत स्थिति", unknownCost: "लागत सत्यापित नहीं", guaranteed: "परिणाम की गारंटी नहीं है।",
    evidence: "कुंडली संदर्भ", free: "निःशुल्क विकल्प", purpose: "उद्देश्य", tradition: "परंपरा / स्रोत", materials: "सामग्री", steps: "सुरक्षित चरण", duration: "सुझाई अवधि", time: "समय", price: "कॉन्फ़िगर की गई कीमत", safety: "सुरक्षा", evidenceLabel: "प्रमाण वर्गीकरण", noPrice: "कीमत कॉन्फ़िगर नहीं है", notPersonalized: "कोई समर्थित कुंडली-विशिष्ट उपाय नियम लागू नहीं है।",
    disclaimer: "पारंपरिक विश्वास वैज्ञानिक प्रमाण नहीं है। डर, गारंटी या श्राप के दावे पर कभी भुगतान न करें। जरूरत पर योग्य चिकित्सा, कानूनी या वित्तीय सहायता लें।",
    basicMantra: "मूल मंत्र और दैनिक अभ्यास", basicMantraIntro: "वैकल्पिक भक्ति और चिंतन अभ्यास कुंडली-विशिष्ट सुझावों से अलग दिए गए हैं।", basicMantraSafety: "अभ्यास अपनी इच्छा से चुनें और परेशानी होने पर रोक दें। कोई मंत्र या भक्ति अभ्यास स्वास्थ्य, संबंध, करियर, आर्थिक या अन्य जीवन-परिणाम की गारंटी नहीं देता।",
    navBack: "कुंडली पर लौटें", navHome: "कुंडली कार्यक्षेत्र", count: "उपाय",
  },
  hinglish: {
    eyebrow: "LIFE / TRADITIONAL PRACTICES", title: "Remedies & Upay", intro: "Simple, safe traditional practices aur practical alternatives browse karein. Yeh educational aur devotional options hain, guaranteed interventions nahi.",
    search: "Remedies search karein", category: "Tradition", problem: "Aapka goal", sort: "Sort", all: "Sabhi", lowest: "Lowest price first", highest: "Highest price first", categorySort: "Category ke hisaab se",
    chartReady: "Context ke liye calculated chart available hai.", noChart: "Koi chart load nahi hai. Sabhi remedies browse karein; chart calculate hone tak recommendations general rahengi.", personalized: "Aapke chart ke liye personalized", personalizedIntro: "Yahan sirf reviewed, provenance-gated rules aa sakte hain. Neeche general catalog remedies alag hain.", noSupported: "Is concern ke liye sufficiently supported chart-specific rule active nahi hai. Neeche ke practices personalized nahi hain.", chartUsed: "Used chart", calculation: "Calculation", currentDasha: "Current Dasha", noDasha: "Current time available Dasha horizon ke bahar hai.", noRecommendations: "Koi personalized recommendation nahi.", sourceStatus: "Source status", confidence: "Rule applicability confidence", costStatus: "Cost status", unknownCost: "Cost verified nahi", guaranteed: "Results guaranteed nahi hain.",
    evidence: "Chart context", free: "Free alternative", purpose: "Intended purpose", tradition: "Tradition / source", materials: "Materials", steps: "Safe steps", duration: "Suggested duration", time: "Time", price: "Configured price", safety: "Safety", evidenceLabel: "Evidence classification", noPrice: "Price configured nahi hai", notPersonalized: "Koi supported chart-specific remedy rule apply nahi hua.",
    disclaimer: "Traditional belief scientific proof nahi hai. Fear, guarantee ya curse claim ki wajah se kabhi pay na karein. Zarurat par qualified medical, legal ya financial help lein.",
    basicMantra: "Basic Mantra & Daily Practices", basicMantraIntro: "Optional devotional aur reflective practices chart-specific recommendations se alag hain.", basicMantraSafety: "Practices apni marzi se choose karein aur distress ho to rok dein. Koi mantra ya devotional practice health, relationship, career, financial ya kisi life outcome ki guarantee nahi deta.",
    navBack: "Kundli par wapas", navHome: "Chart workspace", count: "remedies",
  },
} as const;

function loadChart(value: string | null): RemedyChart | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as RemedyChart;
  } catch {
    return null;
  }
}

export default function RemediesPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<RemedyCategory | "all">("all");
  const [problem, setProblem] = useState<RemedyProblem | "all">("all");
  const [order, setOrder] = useState<SortOrder>("lowest");
  const [chart, setChart] = useState<RemedyChart | null>(null);
  const t = copy[language];

  useEffect(() => {
    const savedLanguage = readLanguagePreference(window.localStorage);
    setLanguage(savedLanguage);
    const refresh = () => setChart(loadChart(window.sessionStorage.getItem(chartStorageKey)));
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("storage", refresh); };
  }, []);

  function changeLanguage(value: string) {
    if (!isLanguage(value)) return;
    setLanguage(value);
    writeLanguagePreference(window.localStorage, value);
    document.documentElement.lang = value === "hi" ? "hi" : value === "hinglish" ? "hi-Latn" : "en";
  }

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const filtered = remedyCatalog.filter((remedy) =>
      (category === "all" || remedy.category === category)
      && (problem === "all" || remedy.problems.includes(problem))
      && (!normalized || [remedy.name[language], remedy.purpose[language], remedy.tradition[language]].join(" ").toLocaleLowerCase().includes(normalized)),
    );
    return sortRemedies(filtered, order);
  }, [category, language, order, problem, query]);
  const personalized = useMemo(() => evaluatePersonalizedRemedies(chart, remedyCatalog, language, problem), [chart, language, problem]);

  return <main className="remedies-shell">
    <header className="remedies-top">
      <a href="/" className="remedies-brand">✳ LIFE <span>JYOTISH WORKBENCH</span></a>
      <div className="remedies-top-actions">
        <label htmlFor="remedies-language">{translate(language, "language.label")}<select id="remedies-language" value={language} onChange={(event) => changeLanguage(event.target.value)}><option value="en">English</option><option value="hi">हिन्दी</option><option value="hinglish">Hinglish</option></select></label>
        <a href="/">{t.navBack}</a>
      </div>
    </header>
    <section className="remedies-hero">
      <div className="remedies-eyebrow">{t.eyebrow}</div>
      <h1>{t.title}</h1>
      <p>{t.intro}</p>
      <p><a href="/references#life-remedy-attributions-pending">Sources and attribution status</a></p>
      <div className="remedies-disclaimer">{t.disclaimer}</div>
      <p className="remedies-chart-state" role="status">{chart ? t.chartReady : t.noChart}</p>
    </section>
    <section className="remedies-content" aria-labelledby="personalized-remedies-heading">
      <div className="remedies-hero"><div className="remedies-eyebrow">{t.personalized}</div><h2 id="personalized-remedies-heading">{t.personalized}</h2><p>{t.personalizedIntro}</p></div>
      <p className="remedies-chart-state" role="status">{personalized.explanation[language]}</p>
      {personalized.chart && <dl className="remedy-personalization-meta">
        <dt>{t.chartUsed}</dt><dd>{personalized.chart.birthProfile ?? t.noChart} · provenance verified</dd>
        <dt>{t.calculation}</dt><dd>{personalized.chart.calculationVersion} · {personalized.chart.ruleSetVersion ?? "version unavailable"}</dd>
        <dt>{t.currentDasha}</dt><dd>{personalized.currentDasha ? `${personalized.currentDasha.mahadasha}${personalized.currentDasha.antardasha ? ` / ${personalized.currentDasha.antardasha}` : ""}` : t.noDasha}</dd>
      </dl>}
      {personalized.recommendations.length === 0 && <p className="remedies-empty">{personalized.status === "needs_chart" ? t.noChart : t.noRecommendations}</p>}
      {personalized.recommendations.map((recommendation) => <article className="remedy-card" key={`${recommendation.ruleId}-${recommendation.remedy.id}`}>
        <h3>{localized(recommendation.remedy.name, language)}</h3><p><b>{t.tradition}:</b> {recommendation.tradition}</p><p>{recommendation.reason}</p>
        <p>{recommendation.applicableFactors.join(" · ")}</p>
        <p><b>{t.sourceStatus}:</b> {recommendation.sourceStatus} · <b>{t.confidence}:</b> {recommendation.confidence}</p>
        <p><b>{t.costStatus}:</b> {recommendation.costStatus === "unknown" ? t.unknownCost : recommendation.cost === 0 ? "₹0" : `₹${recommendation.cost}`}</p>
        <p><b>{t.free}:</b> {recommendation.freeAlternative}</p><p><b>{t.safety}:</b> {recommendation.safety}</p><p>{t.guaranteed}</p>
      </article>)}
    </section>
    <section className="remedies-content" aria-labelledby="basic-mantra-heading">
      <div className="remedies-hero"><div className="remedies-eyebrow">{t.basicMantra}</div><h2 id="basic-mantra-heading">{t.basicMantra}</h2><p>{t.basicMantraIntro}</p></div>
      <div className="remedy-callout"><p>{t.basicMantraSafety}</p></div>
    </section>
    <section className="remedies-content" aria-label={t.title}>
      <div className="remedies-tools">
        <label>{t.search}<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label>{t.category}<select value={category} onChange={(event) => setCategory(event.target.value as RemedyCategory | "all")}><option value="all">{t.all}</option>{remedyCategories.map((item) => <option key={item.id} value={item.id}>{localized(item.label, language)}</option>)}</select></label>
        <label>{t.problem}<select value={problem} onChange={(event) => setProblem(event.target.value as RemedyProblem | "all")}><option value="all">{t.all}</option>{remedyProblems.map((item) => <option key={item.id} value={item.id}>{localized(item.label, language)}</option>)}</select></label>
        <label>{t.sort}<select value={order} onChange={(event) => setOrder(event.target.value as SortOrder)}><option value="lowest">{t.lowest}</option><option value="highest">{t.highest}</option><option value="category">{t.categorySort}</option></select></label>
      </div>
      <p className="remedies-count">{visible.length} {t.count}</p>
      <div className="remedy-grid">
        {visible.map((remedy) => <article className="remedy-card" key={remedy.id}>
          <div className="remedy-card-head"><span>{localized(remedyCategories.find((item) => item.id === remedy.category)!.label, language)}</span><strong>{remedy.price === 0 ? "₹0" : remedy.price === null ? t.noPrice : `₹${remedy.price.toLocaleString("en-IN")}`}</strong></div>
          <h2>{localized(remedy.name, language)}</h2>
          <p className="remedy-purpose">{localized(remedy.purpose, language)}</p>
          <details><summary>{t.tradition}</summary><p>{localized(remedy.tradition, language)}</p></details>
          <details><summary>{t.steps}</summary><p>{localized(remedy.steps, language)}</p></details>
          <dl>
            <dt>{t.materials}</dt><dd>{localized(remedy.materials, language)}</dd>
            <dt>{t.duration}</dt><dd>{localized(remedy.duration, language)}</dd>
            <dt>{t.time}</dt><dd>{localized(remedy.time, language)}</dd>
            <dt>{t.price}</dt><dd>{remedy.price === null ? t.noPrice : remedy.price === 0 ? "₹0" : `₹${remedy.price.toLocaleString("en-IN")}`}</dd>
          </dl>
          <div className="remedy-callout"><b>{t.free}</b><p>{localized(remedy.freeAlternative, language)}</p></div>
          <details><summary>{t.safety}</summary><p>{localized(remedy.safety, language)}</p></details>
          <p className="remedy-evidence"><b>{t.evidenceLabel}:</b> {localized(remedy.evidence, language)}</p>
          {chart && remedy.chartFactors.length > 0 && <details><summary>{t.evidence}</summary><ul>{remedy.chartFactors.map((factor) => <li key={factor}>{factor}</li>)}</ul><p>{t.notPersonalized}</p></details>}
        </article>)}
      </div>
      {visible.length === 0 && <p className="remedies-empty">{t.all}: 0</p>}
    </section>
  </main>;
}
