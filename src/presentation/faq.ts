import { translate, type Language } from "./language.ts";

export const faqCategories = ["basics", "career", "relationships", "money", "timing", "life"] as const;
export type FaqCategory = (typeof faqCategories)[number];

export const faqQuestions: { id: string; category: FaqCategory; questionKey: string; answerKey: string }[] = [
  { id: "chart", category: "basics", questionKey: "faq.basics.chart.q", answerKey: "faq.basics.chart.a" },
  { id: "lagna", category: "basics", questionKey: "faq.basics.lagna.q", answerKey: "faq.basics.lagna.a" },
  { id: "sun-moon", category: "basics", questionKey: "faq.basics.sunMoon.q", answerKey: "faq.basics.sunMoon.a" },
  { id: "nakshatra", category: "basics", questionKey: "faq.basics.nakshatra.q", answerKey: "faq.basics.nakshatra.a" },
  { id: "houses", category: "basics", questionKey: "faq.basics.houses.q", answerKey: "faq.basics.houses.a" },
  { id: "d1-d9", category: "basics", questionKey: "faq.basics.d1d9.q", answerKey: "faq.basics.d1d9.a" },
  { id: "career-factors", category: "career", questionKey: "faq.career.factors.q", answerKey: "faq.career.factors.a" },
  { id: "tenth-house", category: "career", questionKey: "faq.career.tenth.q", answerKey: "faq.career.tenth.a" },
  { id: "education", category: "career", questionKey: "faq.career.education.q", answerKey: "faq.career.education.a" },
  { id: "career-dasha", category: "career", questionKey: "faq.career.dasha.q", answerKey: "faq.career.dasha.a" },
  { id: "marriage-factors", category: "relationships", questionKey: "faq.relationship.factors.q", answerKey: "faq.relationship.factors.a" },
  { id: "seventh-house", category: "relationships", questionKey: "faq.relationship.seventh.q", answerKey: "faq.relationship.seventh.a" },
  { id: "navamsa", category: "relationships", questionKey: "faq.relationship.navamsa.q", answerKey: "faq.relationship.navamsa.a" },
  { id: "relationship-dasha", category: "relationships", questionKey: "faq.relationship.dasha.q", answerKey: "faq.relationship.dasha.a" },
  { id: "finance-houses", category: "money", questionKey: "faq.money.houses.q", answerKey: "faq.money.houses.a" },
  { id: "business", category: "money", questionKey: "faq.money.business.q", answerKey: "faq.money.business.a" },
  { id: "income-savings-wealth", category: "money", questionKey: "faq.money.indicators.q", answerKey: "faq.money.indicators.a" },
  { id: "financial-combinations", category: "money", questionKey: "faq.money.combinations.q", answerKey: "faq.money.combinations.a" },
  { id: "vimshottari", category: "timing", questionKey: "faq.timing.vimshottari.q", answerKey: "faq.timing.vimshottari.a" },
  { id: "dasha-levels", category: "timing", questionKey: "faq.timing.levels.q", answerKey: "faq.timing.levels.a" },
  { id: "transits", category: "timing", questionKey: "faq.timing.transit.q", answerKey: "faq.timing.transit.a" },
  { id: "rahu-ketu", category: "timing", questionKey: "faq.timing.nodes.q", answerKey: "faq.timing.nodes.a" },
  { id: "yoga-dosha", category: "timing", questionKey: "faq.timing.yoga.q", answerKey: "faq.timing.yoga.a" },
  { id: "remedies", category: "timing", questionKey: "faq.timing.remedies.q", answerKey: "faq.timing.remedies.a" },
  { id: "lahiri", category: "life", questionKey: "faq.life.lahiri.q", answerKey: "faq.life.lahiri.a" },
  { id: "kp-ayanamsa", category: "life", questionKey: "faq.life.kp.q", answerKey: "faq.life.kp.a" },
  { id: "house-systems", category: "life", questionKey: "faq.life.houses.q", answerKey: "faq.life.houses.a" },
  { id: "software-differences", category: "life", questionKey: "faq.life.software.q", answerKey: "faq.life.software.a" },
  { id: "node-modes", category: "life", questionKey: "faq.life.nodes.q", answerKey: "faq.life.nodes.a" },
  { id: "birth-time", category: "life", questionKey: "faq.life.birthTime.q", answerKey: "faq.life.birthTime.a" },
  { id: "independent-validation", category: "life", questionKey: "faq.life.references.q", answerKey: "faq.life.references.a" },
];

export function searchFaq(search: string, category: FaqCategory | "all", language: Language) {
  const normalized = search.trim().toLocaleLowerCase(language === "hi" ? "hi-IN" : "en");
  return faqQuestions.filter((question) => {
    if (category !== "all" && question.category !== category) return false;
    if (!normalized) return true;
    return `${translate(language, question.questionKey)} ${translate(language, question.answerKey)}`
      .toLocaleLowerCase(language === "hi" ? "hi-IN" : "en")
      .includes(normalized);
  });
}
