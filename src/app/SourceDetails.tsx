import type { MarriageTimingSource } from "@/presentation/marriage-timing-sources";

export default function SourceDetails({ sources, title = "Sources & Calculation References" }: { sources: MarriageTimingSource[]; title?: string }) {
  return <section className="source-details">
    <h2>{title}</h2>
    {sources.map((source) => <article key={source.id}>
      <h3>{source.title}</h3>
      <p>{source.authorOrOrganization}; {source.publisher}</p>
      <p>{source.section}</p>
      <p>{source.supports}</p>
      <p>Verification status: {source.status.replace(/_/g, " ")}</p>
      {source.officialUrl
        ? <a href={source.officialUrl} target="_blank" rel="noopener noreferrer">{source.officialUrl}</a>
        : <p>This is a LIFE implementation convention; no external source is claimed.</p>}
    </article>)}
  </section>;
}
