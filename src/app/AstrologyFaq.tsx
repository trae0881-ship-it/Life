"use client";

import { useMemo, useState } from "react";
import { faqCategories, faqQuestions, searchFaq, type FaqCategory } from "@/presentation/faq";
import { translate, type Language } from "@/presentation/language";

export default function AstrologyFaq({ language }: { language: Language }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FaqCategory | "all">("all");
  const questions = useMemo(() => searchFaq(search, category, language), [search, category, language]);
  return <section className="card positions-card faq-card" id="faq">
    <div className="card-head"><div><div className="section-index">{translate(language, "faq.index")}</div><h2>{translate(language, "faq.title")}</h2></div><span className="table-count">{questions.length} / {faqQuestions.length}</span></div>
    <p className="faq-disclaimer">{translate(language, "faq.disclaimer")}</p>
    <p className="faq-glossary">{translate(language, "faq.simple.lagna")} {translate(language, "faq.simple.nakshatra")} {translate(language, "faq.simple.dasha")} {translate(language, "faq.simple.graha")} {translate(language, "faq.simple.bhava")}</p>
    <label className="field-label faq-search">{translate(language, "faq.search")}<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    <div className="faq-filters" role="group" aria-label={translate(language, "faq.title")}>
      <button type="button" aria-pressed={category === "all"} className={category === "all" ? "selected" : ""} onClick={() => setCategory("all")}>{translate(language, "faq.all")}</button>
      {faqCategories.map((item) => <button type="button" key={item} aria-pressed={category === item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{translate(language, `faq.category.${item}`)}</button>)}
    </div>
    {questions.length ? <div className="faq-list">{questions.map((item) => <details key={item.id} className="faq-item">
      <summary>{translate(language, item.questionKey)}</summary>
      <p>{translate(language, item.answerKey)}</p>
    </details>)}</div> : <p className="faq-empty" role="status">{translate(language, "faq.noResults")}</p>}
  </section>;
}
