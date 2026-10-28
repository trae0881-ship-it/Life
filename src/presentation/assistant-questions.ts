import type { AssistantTopic } from "./kundli-assistant.ts";
import { translate, type Language } from "./language.ts";

export type AssistantQuestionCategory =
  | "marriage"
  | "government"
  | "career"
  | "business"
  | "money"
  | "foreign"
  | "other";

export type AssistantQuestionId =
  | "marriage_timing" | "partner_timing" | "love_arranged" | "marriage_dasha"
  | "marriage_factors" | "partner_indicators" | "compatibility" | "marriage_limitations"
  | "government_timing" | "government_indicators" | "job_type_comparison" | "government_dasha"
  | "career_growth" | "job_transit_dasha" | "competitive_exams" | "career_delay"
  | "new_job_timing" | "job_change" | "business_start" | "business_job_difference"
  | "partnership_business" | "career_dasha" | "financial_growth" | "income_savings"
  | "property" | "business_career_income" | "financial_timing" | "foreign_timing"
  | "foreign_travel_indicators" | "foreign_settlement" | "abroad_job_study" | "current_dasha"
  | "strongest_indicators" | "calculated_yogas" | "rahu_ketu" | "navamsa"
  | "next_12_months_transits" | "required_data";

export type AssistantQuestion = {
  id: AssistantQuestionId;
  category: AssistantQuestionCategory;
  topic: AssistantTopic;
  mode?: "timing" | "relationship" | "career" | "career-timing" | "property" | "foreign" | "comparison" | "strongest" | "nodes" | "long-transits" | "required-data" | "limitations";
};

export const assistantQuestionCatalog: AssistantQuestion[] = [
  { id: "marriage_timing", category: "marriage", topic: "relationships", mode: "timing" },
  { id: "partner_timing", category: "marriage", topic: "relationships", mode: "timing" },
  { id: "love_arranged", category: "marriage", topic: "relationships", mode: "relationship" },
  { id: "marriage_dasha", category: "marriage", topic: "relationships", mode: "timing" },
  { id: "marriage_factors", category: "marriage", topic: "relationships", mode: "relationship" },
  { id: "partner_indicators", category: "marriage", topic: "relationships", mode: "relationship" },
  { id: "compatibility", category: "marriage", topic: "relationships", mode: "relationship" },
  { id: "marriage_limitations", category: "marriage", topic: "relationships", mode: "limitations" },
  { id: "government_timing", category: "government", topic: "career", mode: "timing" },
  { id: "government_indicators", category: "government", topic: "career", mode: "career" },
  { id: "job_type_comparison", category: "government", topic: "career", mode: "comparison" },
  { id: "government_dasha", category: "government", topic: "career", mode: "timing" },
  { id: "career_growth", category: "government", topic: "career", mode: "career" },
  { id: "job_transit_dasha", category: "government", topic: "career", mode: "career-timing" },
  { id: "competitive_exams", category: "government", topic: "career", mode: "career" },
  { id: "career_delay", category: "government", topic: "career", mode: "career" },
  { id: "new_job_timing", category: "career", topic: "career", mode: "timing" },
  { id: "job_change", category: "career", topic: "career", mode: "career" },
  { id: "business_start", category: "business", topic: "business", mode: "timing" },
  { id: "business_job_difference", category: "business", topic: "business", mode: "comparison" },
  { id: "partnership_business", category: "business", topic: "business", mode: "comparison" },
  { id: "career_dasha", category: "business", topic: "career", mode: "career-timing" },
  { id: "financial_growth", category: "money", topic: "business" },
  { id: "income_savings", category: "money", topic: "business", mode: "comparison" },
  { id: "property", category: "money", topic: "business", mode: "property" },
  { id: "business_career_income", category: "money", topic: "business", mode: "comparison" },
  { id: "financial_timing", category: "money", topic: "business", mode: "career-timing" },
  { id: "foreign_timing", category: "foreign", topic: "basics", mode: "foreign" },
  { id: "foreign_travel_indicators", category: "foreign", topic: "basics", mode: "foreign" },
  { id: "foreign_settlement", category: "foreign", topic: "basics", mode: "foreign" },
  { id: "abroad_job_study", category: "foreign", topic: "basics", mode: "foreign" },
  { id: "current_dasha", category: "other", topic: "dasha" },
  { id: "strongest_indicators", category: "other", topic: "interpretation", mode: "strongest" },
  { id: "calculated_yogas", category: "other", topic: "yogas" },
  { id: "rahu_ketu", category: "other", topic: "basics", mode: "nodes" },
  { id: "navamsa", category: "other", topic: "vargas" },
  { id: "next_12_months_transits", category: "other", topic: "transits", mode: "long-transits" },
  { id: "required_data", category: "other", topic: "basics", mode: "required-data" },
];

export function filterAssistantQuestions(
  category: AssistantQuestionCategory | "all",
  search: string,
  language: Language,
): AssistantQuestion[] {
  const term = search.trim().toLocaleLowerCase();
  return assistantQuestionCatalog.filter((item) =>
    (category === "all" || item.category === category)
    && (!term || translate(language, `assistant.popular.${item.id}`).toLocaleLowerCase().includes(term)
      || item.id.replaceAll("_", " ").includes(term)),
  );
}
