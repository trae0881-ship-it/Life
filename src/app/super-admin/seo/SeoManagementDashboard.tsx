"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { SeoAuditRecord, SeoCheckStatus, SeoPageSettings } from "@/server/seo-management";

type DashboardData = {
  pages: SeoPageSettings[];
  audits: SeoAuditRecord[];
  lastAudit: SeoAuditRecord | null;
  indexedPages: number | null;
  indexedPagesSource: "unavailable";
  searchConsole: { configured: false; status: "not_configured" };
  sitemap: { status: "configured" | "base_url_missing"; pageCount: number };
  robots: { status: "generated_from_safe_defaults" };
  persistence: {
    type: "postgresql" | "test_file";
    durableInProduction: boolean;
    note: string;
  };
};

const emptyState = "Not yet audited";

export default function SeoManagementDashboard({ email }: { email: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedPath, setSelectedPath] = useState("");
  const [draft, setDraft] = useState<SeoPageSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [auditFilter, setAuditFilter] = useState("");

  function statusBadge(status: SeoCheckStatus) {
    return <span className={`seo-status-badge seo-status-${status.toLowerCase()}`}>{status.replace("_", " ")}</span>;
  }

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/super-admin/seo", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "SEO settings could not be loaded.");
      const dashboard = result as DashboardData;
      if (!Array.isArray(dashboard.pages) || !Array.isArray(dashboard.audits)) throw new Error("SEO response was invalid.");
      setData(dashboard);
      const current = dashboard.pages.find((page) => page.path === selectedPath) ?? dashboard.pages[0] ?? null;
      if (current) {
        setSelectedPath(current.path);
        setDraft(current);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "SEO settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  function choosePage(page: SeoPageSettings) {
    setSelectedPath(page.path);
    setDraft(page);
    setNotice("");
  }

  async function saveMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/super-admin/seo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: draft }),
      });
      const result = await response.json();
      if (!response.ok || !result.page) throw new Error(result.error ?? "SEO metadata could not be saved.");
      setDraft(result.page as SeoPageSettings);
      setData((current) => current
        ? { ...current, pages: current.pages.map((page) => page.path === draft.path ? result.page as SeoPageSettings : page) }
        : current);
      setNotice("Metadata saved. Re-run the technical audit to verify rendered page output.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "SEO metadata could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function runAudit() {
    setAuditing(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/super-admin/seo/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const result = await response.json();
      if (!response.ok || !result.audit) throw new Error(result.error ?? "The technical audit could not complete.");
      setNotice(`Technical audit completed. Overall status: ${result.audit.resultStatus ?? "NOT CHECKED"}. Search Console indexing remains unverified.`);
      await loadDashboard();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The technical audit could not complete.");
    } finally {
      setAuditing(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error("Sign out failed.");
      window.location.assign("/super-login");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign out failed.");
      setSigningOut(false);
    }
  }

  const metrics = data?.lastAudit?.metrics;
  const metricCards = [
    { label: "Overall audit status", value: data?.lastAudit?.resultStatus ?? emptyState },
    { label: "Indexed pages", value: data?.indexedPages === null || !data ? "Unavailable" : data.indexedPages, note: "Search Console is not connected; Google indexing is not verified." },
    { label: "Missing titles", value: metrics?.missingTitles ?? emptyState },
    { label: "Missing meta descriptions", value: metrics?.missingDescriptions ?? emptyState },
    { label: "Duplicate titles", value: metrics?.duplicateTitles ?? emptyState },
    { label: "Duplicate descriptions", value: metrics?.duplicateDescriptions ?? emptyState },
    { label: "Missing canonical tags", value: metrics?.missingCanonicals ?? emptyState },
    { label: "Titles outside heuristic range", value: metrics?.titleOutOfRange ?? emptyState, note: "Review length only; this is not a Google ranking rule." },
    { label: "Descriptions outside heuristic range", value: metrics?.descriptionOutOfRange ?? emptyState, note: "Review length only; this is not a Google ranking rule." },
    { label: "Incomplete Open Graph", value: metrics?.missingOpenGraph ?? emptyState },
    { label: "Images missing alt attributes", value: metrics?.imagesMissingAlt ?? emptyState },
    { label: "Broken internal links", value: metrics?.brokenInternalLinks ?? emptyState },
    { label: "Missing H1 headings", value: metrics?.missingH1 ?? emptyState },
    { label: "Valid JSON-LD blocks", value: metrics?.validJsonLdBlocks ?? emptyState },
    { label: "Invalid JSON-LD blocks", value: metrics?.invalidJsonLdBlocks ?? emptyState },
  ];
  const search = auditFilter.trim().toLowerCase();
  const filteredAuditPages = data?.lastAudit?.pages.filter((page) => !search
    || page.path.toLowerCase().includes(search)
    || (page.resultStatus ?? "NOT_CHECKED").toLowerCase().includes(search)) ?? [];

  return (
    <main className="super-admin-shell">
      <aside className="super-admin-sidebar">
        <a className="super-admin-brand" href="/super-admin">Super Admin<small>LIFE · OPERATIONS</small></a>
        <p className="super-admin-identity"><span>Signed in as</span><b>{email}</b></p>
        <nav aria-label="Super Admin navigation" className="super-admin-nav">
          <a href="/super-admin">Overview and admin tools</a>
          <a aria-current="page" className="active" href="/super-admin/seo">SEO Management</a>
          <a href="/super-admin/blogs">Blog Management</a>
          <a href="/admin/scripts">Head / body scripts</a>
        </nav>
        <div className="super-admin-sidebar-foot">
          <a href="/dashboard">User dashboard</a>
          <button disabled={signingOut} onClick={() => void signOut()} type="button">
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      <section className="super-admin-main">
        <header className="super-admin-topbar"><span>SEO MANAGEMENT</span><span>Super Admin</span></header>
        <div className="super-admin-content">
          <p className="super-admin-eyebrow">LIFE · SEARCH VISIBILITY</p>
          <h1>SEO Management</h1>
          <p className="super-admin-description">Manage metadata for eligible public LIFE pages and run a bounded technical audit against this application. Counts are local measurements only; Google indexing data is unavailable until Search Console is connected.</p>

          <div className="seo-toolbar">
            <button disabled={auditing || loading} onClick={() => void runAudit()} type="button">
              {auditing ? "Auditing…" : "Run technical audit"}
            </button>
            <a href="/api/super-admin/seo/export">Export audit history (CSV)</a>
            {data?.lastAudit && <span className="seo-note">Last audit: <time dateTime={data.lastAudit.completedAt}>{new Date(data.lastAudit.completedAt).toLocaleString()}</time></span>}
          </div>

          {notice && <p className="seo-message" role="status">{notice}</p>}
          {error && <div className="super-admin-error" role="alert"><p>{error}</p></div>}
          {loading && <p aria-live="polite" className="super-admin-state">Loading SEO data…</p>}

          <section aria-label="SEO measured results" className="seo-metrics">
            {metricCards.map((card) => (
              <article className="super-admin-card" key={card.label}>
                <h2>{card.label}</h2>
                <p>{card.label === "Overall audit status"
                  ? statusBadge(data?.lastAudit?.resultStatus ?? "NOT_CHECKED")
                  : typeof card.value === "number" ? card.value.toLocaleString() : card.value}</p>
                {"note" in card && <small>{card.note}</small>}
              </article>
            ))}
          </section>
          <p className="seo-note">Readiness is an internal heuristic based on measured technical checks and copy lengths. It is not a Google ranking prediction, search-volume estimate, or promise of visibility.</p>

          <div className="super-admin-health-grid">
            <article className="super-admin-card">
              <h2>Sitemap</h2>
              <p>{data?.lastAudit
                ? data.lastAudit.sitemap.valid ? "Valid" : "Needs attention"
                : data?.sitemap.status === "configured" ? "Not yet audited" : "Base URL not configured"}</p>
              <small>{data?.sitemap.pageCount ?? 0} canonical, indexable pages configured. <a href="/sitemap.xml">View sitemap</a>. {data?.sitemap.status === "base_url_missing" ? "Absolute sitemap URLs require LIFE_PUBLIC_APP_URL." : ""} {data?.lastAudit ? `Last HTTP status: ${data.lastAudit.sitemap.status ?? "unavailable"}.` : ""}</small>
            </article>
            <article className="super-admin-card">
              <h2>robots.txt</h2>
              <p>{data?.lastAudit
                ? data.lastAudit.robots.valid ? "Valid" : "Needs attention"
                : data ? "Not yet audited" : "Not checked"}</p>
              <small>Generated rules block API, admin, dashboard and private Super Admin paths from crawlers; this is not an authorization control. <a href="/robots.txt">View robots.txt</a>. {data?.lastAudit ? `${data.lastAudit.robots.unblockedPrivatePaths?.length ?? 0} required private path(s) were not blocked; HTTP ${data.lastAudit.robots.status ?? "unavailable"}.` : ""}</small>
            </article>
            <article className="super-admin-card">
              <h2>Structured data</h2>
              <p>{metrics ? metrics.validJsonLdBlocks + metrics.invalidJsonLdBlocks === 0 ? "No JSON-LD detected" : "Audited" : "Not yet audited"}</p>
              <small>Validation is based on JSON-LD found in audited page HTML.</small>
            </article>
            <article className="super-admin-card">
              <h2>Search Console</h2>
              <p>Not configured</p>
              <small>No OAuth client or Search Console API credentials are configured. No indexing or query data is shown.</small>
            </article>
          </div>

          <section className="seo-editor">
            <div className="seo-editor-panel">
              <h2>Metadata Manager</h2>
              <p className="seo-note">{data?.persistence.note ?? "SEO metadata is stored in the application database."}</p>
              <div className="seo-page-list" aria-label="Managed public pages">
                {data?.pages.map((page) => (
                  <button
                    aria-pressed={selectedPath === page.path}
                    key={page.path}
                    onClick={() => choosePage(page)}
                    type="button"
                  >
                    {page.path === "/" ? "Home" : page.path}
                  </button>
                ))}
              </div>
            </div>
            <form className="seo-editor-panel" onSubmit={(event) => void saveMetadata(event)}>
              <h2>{draft ? `Edit ${draft.path === "/" ? "Home" : draft.path}` : "Choose a page"}</h2>
              {draft && <>
                <label>Page title (up to 70 characters)
                  <input maxLength={70} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required value={draft.title} />
                  <small className="seo-character-count">{draft.title.length}/70 characters</small>
                </label>
                <label>Meta description (up to 160 characters)
                  <textarea maxLength={160} onChange={(event) => setDraft({ ...draft, description: event.target.value })} required value={draft.description} />
                  <small className="seo-character-count">{draft.description.length}/160 characters</small>
                </label>
                <label>Canonical route
                  <select onChange={(event) => setDraft({ ...draft, canonicalPath: event.target.value as SeoPageSettings["canonicalPath"] })} value={draft.canonicalPath}>
                    {data?.pages.map((page) => <option key={page.path} value={page.path}>{page.path}</option>)}
                  </select>
                </label>
                <div className="seo-checks">
                  <label><input checked={draft.robots.index} onChange={(event) => setDraft({ ...draft, robots: { ...draft.robots, index: event.target.checked } })} type="checkbox" /> Allow indexing</label>
                  <label><input checked={draft.robots.follow} onChange={(event) => setDraft({ ...draft, robots: { ...draft.robots, follow: event.target.checked } })} type="checkbox" /> Allow link following</label>
                </div>
                <label>Open Graph title
                  <input maxLength={70} onChange={(event) => setDraft({ ...draft, openGraph: { ...draft.openGraph, title: event.target.value } })} required value={draft.openGraph.title} />
                  <small className="seo-character-count">{draft.openGraph.title.length}/70 characters</small>
                </label>
                <label>Open Graph description
                  <textarea maxLength={160} onChange={(event) => setDraft({ ...draft, openGraph: { ...draft.openGraph, description: event.target.value } })} required value={draft.openGraph.description} />
                  <small className="seo-character-count">{draft.openGraph.description.length}/160 characters</small>
                </label>
                <button disabled={saving} type="submit">{saving ? "Saving…" : "Save metadata"}</button>
              </>}
            </form>
          </section>

          <section aria-labelledby="seo-audit-history">
            <h2 className="seo-section-title" id="seo-audit-history">SEO audit history</h2>
            {data?.lastAudit && <div className="seo-audit-filter">
              <label>Filter latest audit results
                <input onChange={(event) => setAuditFilter(event.target.value)} placeholder="Search route or status" value={auditFilter} />
              </label>
              <span>{data.lastAudit.pages.length} page result(s) · {data.lastAudit.pagesOmitted ?? 0} omitted by audit limit</span>
            </div>}
            {data?.lastAudit && <div className="super-admin-table-wrap">
              <table className="super-admin-user-table seo-page-results">
                <caption>Latest measured results · overall {data.lastAudit.resultStatus ?? "NOT CHECKED"} · heuristic only, not a Google ranking or indexing report</caption>
                <thead><tr><th scope="col">Page</th><th scope="col">Result</th><th scope="col">HTTP</th><th scope="col">Title</th><th scope="col">Description</th><th scope="col">Canonical</th><th scope="col">Robots</th><th scope="col">Open Graph</th><th scope="col">H1</th><th scope="col">Image alt</th><th scope="col">Internal links</th><th scope="col">JSON-LD</th><th scope="col">Sitemap</th></tr></thead>
                <tbody>{filteredAuditPages.length ? filteredAuditPages.map((page) => <tr key={page.path}>
                  <td>{page.path}</td>
                  <td>{statusBadge(page.resultStatus ?? "NOT_CHECKED")}</td>
                  <td>{statusBadge(page.checks?.http.status ?? "NOT_CHECKED")}<small>{page.status ?? "—"}</small></td>
                  <td>{statusBadge(page.checks?.title.status ?? "NOT_CHECKED")}<small>{page.titlePresent ? `${page.titleLength ?? 0} chars` : "Missing"}</small></td>
                  <td>{statusBadge(page.checks?.description.status ?? "NOT_CHECKED")}<small>{page.descriptionPresent ? `${page.descriptionLength ?? 0} chars` : "Missing"}</small></td>
                  <td>{statusBadge(page.checks?.canonical.status ?? "NOT_CHECKED")}<small>{page.canonicalPresent ? "Expected URL matches" : "Missing or differs"}</small></td>
                  <td>{statusBadge(page.checks?.robots.status ?? "NOT_CHECKED")}<small>{page.robotsIndex ? "index" : "noindex"}, {page.robotsFollow ? "follow" : "nofollow"}</small></td>
                  <td>{statusBadge(page.checks?.openGraph.status ?? "NOT_CHECKED")}</td>
                  <td>{statusBadge(page.checks?.h1.status ?? "NOT_CHECKED")}<small>{page.h1Count ?? "—"} H1</small></td>
                  <td>{statusBadge(page.checks?.imageAlt.status ?? "NOT_CHECKED")}<small>{page.imagesMissingAlt ?? "—"} missing</small></td>
                  <td>{statusBadge(page.checks?.internalLinks.status ?? "NOT_CHECKED")}<small>{page.internalLinkCount ?? "—"} found · {page.brokenInternalLinks ?? 0} broken</small></td>
                  <td>{statusBadge(page.checks?.jsonLd.status ?? "NOT_CHECKED")}<small>{page.validJsonLdBlocks ?? 0} valid · {page.invalidJsonLdBlocks ?? 0} invalid</small></td>
                  <td>{statusBadge(page.checks?.sitemap.status ?? "NOT_CHECKED")}</td>
                </tr>) : <tr><td colSpan={13}>No audited pages match this filter.</td></tr>}</tbody>
              </table>
            </div>}
            {data?.lastAudit && <div className="seo-issue-list">
              <h3>Verified issues and suggested corrections</h3>
              {data.lastAudit.pages.flatMap((page) => (page.issues ?? []).map((issue, index) => ({ ...issue, path: page.path, key: `${page.path}:${issue.code}:${index}` }))).length
                ? <ul>{data.lastAudit.pages.flatMap((page) => (page.issues ?? []).map((issue, index) => (
                  <li key={`${page.path}:${issue.code}:${index}`}><b>{issue.severity.toUpperCase()} · {page.path} · {issue.code}</b><p>{issue.message}</p><small>Suggested correction: {issue.suggestion}</small></li>
                )))}</ul>
                : <p>No issues were detected by the available checks.</p>}
            </div>}
            {!data?.audits.length
              ? <p className="super-admin-unavailable">No audit has been run yet. Audit history is stored in the application PostgreSQL database.</p>
              : <div className="super-admin-table-wrap">
                <table className="super-admin-audit-table">
                  <caption>Persisted PostgreSQL audit history. These checks do not report Google indexing.</caption>
                  <thead><tr><th scope="col">Completed</th><th scope="col">Overall</th><th scope="col">Pages audited</th><th scope="col">Pages omitted</th><th scope="col">Missing titles</th><th scope="col">Missing descriptions</th><th scope="col">Broken links</th><th scope="col">Sitemap</th><th scope="col">robots.txt</th></tr></thead>
                  <tbody>{data.audits.map((audit) => <tr key={audit.id}>
                    <td><time dateTime={audit.completedAt}>{new Date(audit.completedAt).toLocaleString()}</time></td>
                    <td>{statusBadge(audit.resultStatus ?? "NOT_CHECKED")}</td>
                    <td>{audit.pagesAudited}</td>
                    <td>{audit.pagesOmitted ?? "—"}</td>
                    <td>{audit.metrics.missingTitles}</td>
                    <td>{audit.metrics.missingDescriptions}</td>
                    <td>{audit.metrics.brokenInternalLinks}</td>
                    <td>{statusBadge(audit.sitemap.check?.status ?? (audit.sitemap.valid ? "PASS" : "NOT_CHECKED"))}</td>
                    <td>{statusBadge(audit.robots.check?.status ?? (audit.robots.valid ? "PASS" : "NOT_CHECKED"))}</td>
                  </tr>)}</tbody>
                </table>
              </div>}
          </section>
        </div>
      </section>
    </main>
  );
}
