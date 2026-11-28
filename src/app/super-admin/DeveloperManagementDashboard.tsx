"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Status = "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
type DeveloperRecord = {
  userId: string;
  status: Status;
  organizationName: string | null;
  website: string | null;
  supportEmail: string | null;
  description: string | null;
  applicationReason: string | null;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  user: { id: string; fullName: string | null; email: string; role: string; createdAt: string };
};
type Filters = { query: string; status: string };

const pageSize = 25;

export default function DeveloperManagementDashboard() {
  const [records, setRecords] = useState<DeveloperRecord[]>([]);
  const [summary, setSummary] = useState({ pending: 0, verified: 0, rejected: 0, suspended: 0, total: 0 });
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Filters>({ query: "", status: "ALL" });
  const [draft, setDraft] = useState<Filters>({ query: "", status: "ALL" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async (nextPage: number, nextFilters: Filters) => {
    setBusy(true);
    setMessage("");
    const params = new URLSearchParams({ page: String(nextPage) });
    if (nextFilters.query) params.set("q", nextFilters.query);
    if (nextFilters.status !== "ALL") params.set("status", nextFilters.status);
    try {
      const response = await fetch(`/api/super-admin/developers?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load Developer applications.");
      setRecords(result.profiles);
      setSummary(result.summary);
      setPage(result.page);
      setPageCount(result.pageCount);
      setTotal(result.total);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load Developer applications.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void load(page, filters); }, [filters, load, page]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { query: draft.query.trim(), status: draft.status };
    setFilters(next);
    setPage(1);
    void load(1, next);
  }

  async function review(record: DeveloperRecord, action: "verify" | "reject" | "suspend" | "reactivate") {
    const labels = { verify: "Verify and enable Developer access", reject: "Reject this application", suspend: "Suspend API access", reactivate: "Reactivate API access" };
    if (!window.confirm(`${labels[action]} for ${record.user.email}?`)) return;
    const reason = action === "reject" ? window.prompt("Enter the required rejection reason:") : undefined;
    if (action === "reject" && !reason?.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/super-admin/developers/${encodeURIComponent(record.userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(reason ? { reason: reason.trim() } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update Developer status.");
      setMessage(`${record.user.email}: ${labels[action]} complete.`);
      await load(page, filters);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update Developer status.");
    } finally {
      setBusy(false);
    }
  }

  const cards = [
    ["Applications", summary.total],
    ["Pending review", summary.pending],
    ["Verified", summary.verified],
    ["Rejected", summary.rejected],
    ["Suspended", summary.suspended],
  ] as const;

  return <div className="super-admin-content">
    <p className="super-admin-eyebrow">API PLATFORM · ACCESS CONTROL</p>
    <h1>Developer verification</h1>
    <p className="super-admin-description">Review Developer applications and manage account access. Verification and role promotion are recorded together with the acting Super Admin.</p>
    <div className="super-admin-metrics">{cards.map(([label, value]) => <article className="super-admin-card" key={label}><h2>{label}</h2><p>{value.toLocaleString()}</p></article>)}</div>
    {message && <p className="developer-admin-message" role="status">{message}</p>}
    <section className="super-admin-users">
      <form className="super-admin-user-filters" onSubmit={applyFilters}>
        <label>Search<input value={draft.query} onChange={(event) => setDraft((old) => ({ ...old, query: event.target.value }))} placeholder="Name, email, organization or ID" /></label>
        <label>Status<select value={draft.status} onChange={(event) => setDraft((old) => ({ ...old, status: event.target.value }))}>
          <option value="ALL">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
        </select></label>
        <button type="submit" disabled={busy}>Apply filters</button>
      </form>
      <p className="developer-admin-result-count" aria-live="polite">{busy ? "Loading applications…" : `${total.toLocaleString()} application${total === 1 ? "" : "s"}`}</p>
      <div className="developers-table-wrap">
        <table className="developers-table developer-admin-table">
          <thead><tr><th>Developer</th><th>Organization</th><th>Status</th><th>Application</th><th>Submitted</th><th>Actions</th></tr></thead>
          <tbody>{records.map((record) => <tr key={record.userId}>
            <td><strong>{record.user.fullName || record.user.email}</strong><br /><small>{record.user.email}</small><br /><code>{record.userId}</code></td>
            <td>{record.organizationName || "—"}{record.website && <><br /><a href={record.website} rel="noreferrer" target="_blank">{record.website}</a></>}</td>
            <td><span className={`developer-status developer-status-${record.status.toLowerCase()}`}>{record.status.replaceAll("_", " ")}</span>{record.rejectionReason && <p className="developers-note">Reason: {record.rejectionReason}</p>}</td>
            <td><strong>Use case:</strong> {record.applicationReason || "—"}{record.description && <p>{record.description}</p>}{record.supportEmail && <small>{record.supportEmail}</small>}</td>
            <td>{new Date(record.submittedAt).toLocaleDateString()}</td>
            <td className="developer-admin-actions">
              {record.status === "PENDING" && <>
                <button disabled={busy} onClick={() => void review(record, "verify")} type="button">Verify</button>
                <button disabled={busy} onClick={() => void review(record, "reject")} type="button">Reject</button>
              </>}
              {record.status === "VERIFIED" && <button disabled={busy} onClick={() => void review(record, "suspend")} type="button">Suspend</button>}
              {record.status === "SUSPENDED" && <button disabled={busy} onClick={() => void review(record, "reactivate")} type="button">Reactivate</button>}
            </td>
          </tr>)}
          {!records.length && <tr><td colSpan={6}>{busy ? "Loading…" : "No Developer applications match these filters."}</td></tr>}</tbody>
        </table>
      </div>
      <nav className="super-admin-pagination" aria-label="Developer application pages">
        <button disabled={busy || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">Previous</button>
        <span>Page {page} of {Math.max(pageCount, 1)}</span>
        <button disabled={busy || page >= pageCount} onClick={() => setPage((value) => value + 1)} type="button">Next</button>
      </nav>
    </section>
  </div>;
}
