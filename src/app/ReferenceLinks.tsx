import { getReferencesByIds } from "@/presentation/references";

export default function ReferenceLinks({
  ids,
  title = "Sources",
}: {
  ids: readonly string[];
  title?: string;
}) {
  const references = getReferencesByIds(ids);
  if (references.length === 0) return null;

  return <aside className="reference-links" aria-label={title}>
    <strong>{title}</strong>
    <ul>
      {references.map((reference) => <li key={reference.id}>
        {reference.url
          ? <a href={reference.url} target="_blank" rel="noopener noreferrer">{reference.title}</a>
          : <span>{reference.title}</span>}
        <small>{reference.verification_status.replace(/_/g, " ")}</small>
      </li>)}
    </ul>
    <a className="reference-more" href="/references">About references and verification</a>
  </aside>;
}
