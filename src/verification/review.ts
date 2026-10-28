export type ReviewRecord = { requirementId: string; reviewer: string };
export type SessionReview = { reviewer: string };

export function checkedRequirements(
  requirementIds: string[],
  acknowledgements: ReviewRecord[],
  sessionReviews: Record<string, SessionReview>,
  reviewer: string,
) {
  const checked = new Set<string>();
  for (const id of requirementIds) {
    if (sessionReviews[id]?.reviewer === reviewer || acknowledgements.some((entry) => entry.requirementId === id && entry.reviewer === reviewer)) checked.add(id);
  }
  return checked;
}
