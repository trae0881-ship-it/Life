import type { Metadata } from "next";
import { referenceCategories, referenceFeatures, referenceRegistry } from "@/presentation/references";
import { metadataForManagedPage } from "@/server/seo-management";
import "../references.css";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForManagedPage("/references");
}

const statusLabels = {
  verified: "Verified",
  partially_verified: "Partially verified",
  not_yet_verified: "Not yet verified",
} as const;

export default function ReferencesPage() {
  return <main className="references-page">
    <header className="references-header">
      <a className="references-brand" href="/">✳ LIFE</a>
      <a href="/">Back to home</a>
    </header>
    <section className="references-intro" aria-labelledby="references-title">
      <p className="references-eyebrow">TRANSPARENT METHODS</p>
      <h1 id="references-title">References &amp; Sources</h1>
      <p>Sources below are mapped only to the LIFE features they actually inform. Astronomy and software comparisons are distinct from traditional interpretations and LIFE's own implementation choices.</p>
      <p className="references-disclaimer">Traditional astrological interpretations are not scientifically validated predictions. A software cross-check or a passing fixture validates only its stated scope; it does not establish a tradition or validate unrelated calculations.</p>
    </section>
    <nav className="references-index" aria-label="Reference categories">
      {referenceCategories.map((category) => <a key={category} href={`#${categoryId(category)}`}>{category}</a>)}
    </nav>
    <div className="references-categories">
      {referenceCategories.map((category) => {
        const entries = referenceRegistry.filter((reference) => reference.category === category);
        return <section className="references-category" id={categoryId(category)} key={category} aria-labelledby={`${categoryId(category)}-title`}>
          <h2 id={`${categoryId(category)}-title`}>{category}</h2>
          {entries.length === 0
            ? <p className="references-empty">{category.startsWith("Research")
              ? "No research source is currently used to validate astrology as a predictive science. LIFE does not claim scientific validation."
              : "No source is currently documented in this category."}</p>
            : <div className="references-grid">{entries.map((reference) => <article className="reference-card" id={reference.id} key={reference.id}>
              <div className={`reference-status reference-status-${reference.verification_status}`}>{statusLabels[reference.verification_status]}</div>
              <h3>{reference.title}</h3>
              <p className="reference-authors">{reference.authors_or_organization}{reference.publisher ? ` · ${reference.publisher}` : ""}</p>
              <p>{reference.description}</p>
              <dl>
                <div><dt>Publication date</dt><dd>{reference.publication_date ?? "Not recorded"}</dd></div>
                <div><dt>Version</dt><dd>{reference.version ?? "Not recorded"}</dd></div>
                <div><dt>Accessed</dt><dd>{reference.accessed_at ?? "Not applicable or not recorded"}</dd></div>
                {reference.license && <div><dt>License / attribution</dt><dd>{reference.license}</dd></div>}
              </dl>
              {reference.verification_review && <details className="reference-review">
                <summary>Review evidence · {reference.verification_review.checked_at}</summary>
                <p>{reference.verification_review.method}</p>
                <ul>{reference.verification_review.evidence.map((evidence) => <li key={evidence}>
                  {evidence.startsWith("https://")
                    ? <a href={evidence} target="_blank" rel="noopener noreferrer">{evidence}</a>
                    : <code>{evidence}</code>}
                </li>)}</ul>
              </details>}
              <div className="reference-uses"><h4>Used by</h4><ul>{reference.used_by.map((feature) => <li key={feature}>{referenceFeatures[feature]}</li>)}</ul></div>
              {reference.url
                ? <a className="reference-url" href={reference.url} target="_blank" rel="noopener noreferrer">Open source <span aria-hidden="true">↗</span></a>
                : <p className="reference-internal">Internal LIFE convention; no external source is claimed.</p>}
            </article>)}</div>}
        </section>;
      })}
    </div>
    <section className="references-add" aria-labelledby="adding-references">
      <h2 id="adding-references">How to add a reference</h2>
      <p>The contributor procedure is documented in <code>docs/REFERENCES.md</code> in the source repository. Add a stable registry ID, inspect the source, map it only to the feature that uses it, record licensing and access metadata only when known, and leave unavailable details empty. Mark inaccessible or unresolved material as not yet verified.</p>
    </section>
  </main>;
}

function categoryId(category: string): string {
  return `category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "")}`;
}
