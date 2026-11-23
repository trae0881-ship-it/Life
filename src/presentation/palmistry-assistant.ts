import type { AssistantQuestionId } from "./assistant-questions.ts";
import type { PalmistryFactor, PalmistryObservations } from "../server/palmistry-observations.ts";

export type PalmistryAnswer =
  | { status: "traditional"; factors: { factor: PalmistryFactor; visibility: "clear" | "faint" }[] }
  | { status: "insufficient" | "unsupported"; factors: [] };

const questionFactors: Partial<Record<AssistantQuestionId, PalmistryFactor[]>> = {
  marriage_factors: ["heartLine"],
  partner_indicators: ["heartLine"],
  government_indicators: ["headLine", "fateLine"],
  career_growth: ["headLine", "fateLine"],
  competitive_exams: ["headLine"],
  financial_growth: ["fateLine", "sunLine"],
  strongest_indicators: ["heartLine", "headLine", "lifeLine", "fateLine", "sunLine"],
};

export function answerPalmistryQuestion(
  observations: PalmistryObservations,
  questionId: AssistantQuestionId,
): PalmistryAnswer {
  const factors = questionFactors[questionId];
  if (!factors) return { status: "unsupported", factors: [] };
  const evidence = factors.flatMap((factor) => {
    const visibility = observations[factor];
    return visibility === "clear" || visibility === "faint" ? [{ factor, visibility }] : [];
  });
  return evidence.length
    ? { status: "traditional", factors: evidence }
    : { status: "insufficient", factors: [] };
}
