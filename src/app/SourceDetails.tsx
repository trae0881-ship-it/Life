import type { MarriageTimingSource } from "@/presentation/marriage-timing-sources";
import { getApprovedExternalHref } from "@/presentation/external-link-policy";

export default function SourceDetails({ sources, title = "Sources & Calculation References" }: { sources: MarriageTimingSource[]; title?: string }) {
  return <section className="source-details">
    <h2>{title}</h2>
    {sources.map((source) => {
      const officialUrl = getApprovedExternalHref(source.officialUrl);
      return <article key={source.id}>
        <h3>{source.title}</h3>
        <p>{source.authorOrOrganization}; {source.publisher}</p>
        <p>{source.section}</p>
        <p>{source.supports}</p>
        <p>Verification status: {source.status.replace(/_/g, " ")}</p>
        {officialUrl
          ? <a href={officialUrl} target="_blank" rel="noopener noreferrer">{officialUrl}</a>
          : source.officialUrl
            ? <p>External source link is not in the approved registry.</p>
            : <p>This is a LIFE implementation convention; no external source is claimed.</p>}
      </article>;
    })}
  </section>;
}
