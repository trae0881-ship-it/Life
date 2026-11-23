import type { AssistantQuestionId } from "./assistant-questions.ts";
import {
  palmistryHands,
  type PalmistryHand,
  type PalmistryLine,
  type PalmistryObservations,
} from "../server/palmistry-observations.ts";

export type PalmistryAnswer =
  | { status: "traditional"; factors: { hand: PalmistryHand; factor: PalmistryLine; visibility: "clear" | "faint" }[] }
  | { status: "insufficient" | "unsupported"; factors: [] };

const questionFactors: Partial<Record<AssistantQuestionId, PalmistryLine[]>> = {
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
  hand: PalmistryHand | "both" = "both",
): PalmistryAnswer {
  const factors = questionFactors[questionId];
  if (!factors) return { status: "unsupported", factors: [] };
  const selectedHands = hand === "both" ? palmistryHands : [hand];
  const evidence = selectedHands.flatMap((selectedHand) => factors.flatMap((factor) => {
    const visibility = observations.hands[selectedHand].lines[factor].visibility;
    return visibility === "clear" || visibility === "faint" ? [{ hand: selectedHand, factor, visibility }] : [];
  }));
  return evidence.length
    ? { status: "traditional", factors: evidence }
    : { status: "insufficient", factors: [] };
}
