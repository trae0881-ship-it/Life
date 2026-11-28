import { getReferencesByIds } from "@/presentation/references";
import { getApprovedExternalHref } from "@/presentation/external-link-policy";

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
      {references.map((reference) => {
        const href = getApprovedExternalHref(reference.url);
        return <li key={reference.id}>
          {href ? <a href={href} target="_blank" rel="noopener noreferrer">{reference.title}</a> : <span>{reference.title}</span>}
          <small>{reference.verification_status.replace(/_/g, " ")}</small>
        </li>;
      })}
    </ul>
    <a className="reference-more" href="/references">About references and verification</a>
  </aside>;
}
