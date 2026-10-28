import { referenceRegistry, referencesForRuleIds, type ReferenceVerificationStatus } from "./references.ts";

export type MarriageSourceStatus = ReferenceVerificationStatus;

export type MarriageTimingSource = {
  id: string;
  title: string;
  authorOrOrganization: string;
  publisher: string;
  officialUrl: string | null;
  section: string;
  supports: string;
  ruleIds: string[];
  status: MarriageSourceStatus;
};

export const marriageTimingSources: MarriageTimingSource[] = referenceRegistry
  .filter((reference) => reference.rule_ids?.length)
  .map((reference) => ({
    id: reference.id,
    title: reference.title,
    authorOrOrganization: reference.authors_or_organization,
    publisher: reference.publisher ?? "LIFE project",
    officialUrl: reference.url,
    section: reference.category,
    supports: reference.description,
    ruleIds: reference.rule_ids ?? [],
    status: reference.verification_status,
  }));

export function sourcesForRuleIds(ruleIds: string[]): MarriageTimingSource[] {
  const matches = referencesForRuleIds(ruleIds);
  return marriageTimingSources.filter((source) => matches.some((reference) => reference.id === source.id));
}
