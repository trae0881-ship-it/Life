"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { checkedRequirements } from "@/verification/review";
import { CHECKLIST_VERSION } from "@/verification/definitions";
import TranslationNotice from "../TranslationNotice";
import "./verification.css";

type Status = "NOT_STARTED" | "IMPLEMENTED" | "TESTED" | "PASS" | "FAIL" | "BLOCKED" | "NOT_TESTED";
type Item = { id: string; number: number; requirement: string; critical: boolean; status: Status; implementationStatus: "IMPLEMENTED" | "PARTIAL" | "NOT_IMPLEMENTED"; testExecutionStatus: "NOT_RUN" | "PASS" | "FAIL"; method: string; actualResult: string; evidenceReference: string; testedAt?: string; remediation: string; note?: string };
type Section = { id: string; number: number; title: string; items: Item[] };
type User = { id: string; email: string; role: "USER" | "DEVELOPER" | "ADMIN" | "SUPER_ADMIN" };
type Approval = { id: string; requirementId: string; approvedAt: string };
type Data = { version: string; sections: Section[]; items: Item[]; total: number; reviewed: number; evidenceCompleteness: number; releaseReady: boolean; criticalIssues: { id: string; requirement: string; status: Status; remediation: string }[]; incompleteModules: { id: string; sectionTitle: string; requirement: string; implementationStatus: Item["implementationStatus"]; status: Status; actualResult: string; evidenceReference: string; testedAt?: string }[]; railwayVerification: { id: string; status: Status; implementationStatus: Item["implementationStatus"]; testExecutionStatus: Item["testExecutionStatus"]; actualResult: string; evidenceReference: string; testedAt?: string } | null; counts: Record<Status, number>; lastRun: { version: string; runId: string; startedAt: string; completedAt: string; checks: { command: string; status: string; exitCode: number | null; startedAt?: string; completedAt?: string }[] } | null; health: { ready: boolean; engine: string }; database: { acknowledgementsPersistent: boolean; acknowledgements: never[] }; lastRunAvailable: boolean };
const labels: Record<Status, string> = { NOT_STARTED: "Not started", IMPLEMENTED: "Implemented", TESTED: "Tested", PASS: "Pass", FAIL: "Fail", BLOCKED: "Blocked", NOT_TESTED: "Not tested" };
const statuses: Status[] = ["NOT_STARTED", "IMPLEMENTED", "TESTED", "PASS", "FAIL", "BLOCKED", "NOT_TESTED"];

export default function VerificationPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState<Item | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [reviewed, setReviewed] = useState<Record<string, { reviewer: string; note?: string }>>({});
  const [reviewStorageReady, setReviewStorageReady] = useState(false);
  const [reviewer, setReviewer] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedInUser, setSignedInUser] = useState<User | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/verification", { cache: "no-store" });
      if (!response.ok) throw new Error("Checklist diagnostics could not load.");
      const result = await response.json() as Data;
      setData(result);
      const accountResponse = await fetch("/api/auth/me", { cache: "no-store" });
      const account = accountResponse.ok ? await accountResponse.json() : { user: null };
      setSignedInUser(account.user);
      if (account.user && ["DEVELOPER", "ADMIN", "SUPER_ADMIN"].includes(account.user.role)) {
        const approvalResponse = await fetch("/api/verification/approvals", { cache: "no-store" });
        if (approvalResponse.ok) setApprovals((await approvalResponse.json()).approvals);
      } else {
        setApprovals([]);
      }
      setError("");
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Checklist diagnostics could not load."); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`life-verification-reviews:${CHECKLIST_VERSION}`);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, { reviewer?: unknown; note?: unknown }>;
        const valid = Object.fromEntries(Object.entries(parsed).filter(([, value]) => value && typeof value.reviewer === "string").map(([id, value]) => [id, { reviewer: value.reviewer as string, ...(typeof value.note === "string" ? { note: value.note } : {}) }]));
        setReviewed(valid);
      }
    } catch { /* Browser storage can be disabled; reviewer state then lasts for this page only. */ }
    setReviewStorageReady(true);
  }, []);
  useEffect(() => {
    if (!reviewStorageReady) return;
    try { localStorage.setItem(`life-verification-reviews:${CHECKLIST_VERSION}`, JSON.stringify(reviewed)); }
    catch { setNotice("Browser storage unavailable; this review state lasts for this page only."); }
  }, [reviewed, reviewStorageReady]);
  const reviewerKey = reviewer.trim() || "Local reviewer";
  const reviewedIds = useMemo(() => checkedRequirements(data?.items.map((item) => item.id) ?? [], data?.database.acknowledgements ?? [], reviewed, reviewerKey), [reviewed, data, reviewerKey]);
  const reviewedCount = reviewedIds.size;
  const untestedCount = data ? data.counts.NOT_TESTED + data.counts.NOT_STARTED + data.counts.IMPLEMENTED : 0;
  const visibleSections = useMemo(() => data?.sections.map((section) => ({ ...section, items: section.items.filter((item) => {
    const queryMatch = !query || `${item.id} ${item.requirement} ${item.status} ${item.method} ${item.remediation}`.toLowerCase().includes(query.toLowerCase());
    const filterMatch = filter === "ALL" || filter === "FAILED_BLOCKED" && ["FAIL", "BLOCKED"].includes(item.status) || filter === "UNTESTED" && ["NOT_STARTED", "IMPLEMENTED", "NOT_TESTED"].includes(item.status) || statuses.includes(filter as Status) && item.status === filter;
    return queryMatch && filterMatch;
  }) })).filter((section) => section.items.length) ?? [], [data, query, filter]);
  function exportFile(type: "json" | "csv" | "md") {
    if (!data) return;
    const payload = { ...data, reviewed: reviewedCount, acknowledgements: [...data.database.acknowledgements, ...Object.entries(reviewed).map(([requirementId, value]) => ({ requirementId, ...value, deviceLocalOnly: true }))] };
    const csvValue = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const content = type === "json" ? JSON.stringify(payload, null, 2) : type === "csv"
      ? ["id,section,requirement,status,implementationStatus,testExecutionStatus,critical,method,evidence,actualResult,testedAt,remediation", ...data.items.map((item) => [item.id, data.sections.find((section) => section.items.some((candidate) => candidate.id === item.id))?.title, item.requirement, item.status, item.implementationStatus, item.testExecutionStatus, item.critical, item.method, item.evidenceReference, item.actualResult, item.testedAt, item.remediation].map(csvValue).join(","))].join("\r\n")
      : `# LIFE Verification Checklist\n\nVersion: ${data.version}\nRelease ready: ${data.releaseReady ? "YES" : "NO"}\nRequirements: ${data.total} · PASS ${data.counts.PASS} · FAIL ${data.counts.FAIL} · BLOCKED ${data.counts.BLOCKED} · UNTESTED ${untestedCount}\nReviewed: ${reviewedCount}/${data.total} (review does not affect release readiness)\nIncomplete/untested modules: ${data.incompleteModules.length}\nRailway verification: ${data.railwayVerification ? `${data.railwayVerification.status} — ${data.railwayVerification.actualResult}` : "No evidence"}\nCritical issues: ${data.criticalIssues.length}\n\n## Incomplete modules\n\n${data.incompleteModules.map((item) => `- [${item.status}] ${item.id} ${item.requirement} · implementation ${item.implementationStatus}\n  Evidence: ${item.evidenceReference}\n  Result: ${item.actualResult}`).join("\n")}\n\n${data.sections.map((section) => `## ${section.number}. ${section.title}\n\n${section.items.map((item) => `- [${item.status}] ${item.id} ${item.requirement}${item.critical ? " (critical)" : ""}\n  Implementation: ${item.implementationStatus} · Test execution: ${item.testExecutionStatus}\n  Evidence: ${item.evidenceReference}\n  Result: ${item.actualResult}\n  Last tested: ${item.testedAt ?? "Not recorded"}\n  Remediation: ${item.remediation}`).join("\n")}`).join("\n\n")}`;
    const blob = new Blob([content], { type: type === "json" ? "application/json" : type === "csv" ? "text/csv" : "text/markdown" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `life-verification-${data.version}.${type}`; link.click(); URL.revokeObjectURL(url);
  }
  async function copySummary() { if (!data) return; const text = `LIFE verification ${data.version}: ${data.releaseReady ? "RELEASE READY" : "RELEASE BLOCKED"}; ${data.total} checks; PASS ${data.counts.PASS}, TESTED ${data.counts.TESTED}, FAIL ${data.counts.FAIL}, BLOCKED ${data.counts.BLOCKED}, not tested ${data.counts.NOT_TESTED + data.counts.NOT_STARTED + data.counts.IMPLEMENTED}; critical open ${data.criticalIssues.length}.`; try { await navigator.clipboard.writeText(text); setNotice("Summary copied."); } catch { setNotice("Clipboard permission unavailable."); } }
  async function acknowledge(item: Item) {
    const who = reviewer.trim() || "Local reviewer";
    if (data?.database.acknowledgementsPersistent) {
      const response = await fetch("/api/verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requirementId: item.id, reviewer: who }) });
      if (response.ok) { await refresh(); setNotice(`Acknowledgement saved for ${item.id}.`); return; }
    }
    setReviewed((old) => ({ ...old, [item.id]: { reviewer: who } })); setNotice("Acknowledged on this browser device only; it does not change technical status.");
  }
  async function unacknowledge(item: Item) {
    setReviewed((old) => { const next = { ...old }; delete next[item.id]; return next; });
  }
  async function setApproval(item: Item, remove = false) {
    const response = await fetch("/api/verification/approvals", {
      method: remove ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirementId: item.id }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setNotice(result.error ?? "Authenticated approval could not be saved.");
      return;
    }
    await refresh();
    setNotice(remove ? `Your authenticated approval was removed from ${item.id}.` : `Authenticated approval saved for ${item.id}.`);
  }
  return <main className="verify-shell"><TranslationNotice /><header className="verify-top"><a href="/" className="verify-brand">LIFE <span>VERIFICATION</span></a><a className="back-link" href="/">← Chart studio</a></header><div className="verify-content">
    <div className="verify-title"><div><p className="verify-eyebrow">RELEASE ASSURANCE · VERSIONED CHECKLIST</p><h1>Verification <i>control room</i></h1><p>Evidence-linked checks for calculation, deployment, persistence and release. Acknowledgements are separate from technical results.</p></div><button className="v-button primary" onClick={() => void refresh()} disabled={busy}>{busy ? "Refreshing…" : "Refresh diagnostics"}</button></div>
    {error && <div className="v-alert fail">{error}</div>}{data && <>
      <div className={`release-banner ${data.releaseReady ? "ready" : "blocked"}`}><span className="release-mark">{data.releaseReady ? "✓" : "!"}</span><div><b>{data.releaseReady ? "Release gate clear" : "Release blocked"}</b><small>{data.releaseReady ? "All critical requirements have PASS evidence." : `${data.criticalIssues.length} critical requirements are not PASS. Review blockers before release.`}</small></div><span className="release-side">{data.releaseReady ? "READY" : "NOT READY"}</span></div>
      <div className="verify-stats">{([["TOTAL", data.total], ["PASS", data.counts.PASS], ["TESTED", data.counts.TESTED], ["FAIL", data.counts.FAIL], ["BLOCKED", data.counts.BLOCKED], ["UNTESTED", untestedCount], ["REVIEWED", `${reviewedCount}/${data.total}`], ["EVIDENCE", `${data.evidenceCompleteness}%`]] as const).map(([label, value]) => <div className="verify-stat" key={label}><small>{label}</small><b>{value}</b></div>)}</div>
      <div className="verify-meta"><span>DEFINITION {data.version}</span><span>ENGINE {data.health.ready ? "READY" : "UNAVAILABLE"}</span><span>ACKS {data.database.acknowledgementsPersistent ? "PERSIST" : "DEVICE ONLY"}</span><span>LAST RUN {data.lastRun ? new Date(data.lastRun.completedAt).toLocaleString() : "NONE RECORDED"}</span></div>
      {!data.lastRunAvailable && <div className="v-alert">No verification run is recorded yet. Use <code>npm run verify</code> to execute tests, type-check and production build. Refresh diagnostics only reads the latest report.</div>}
      {!data.database.acknowledgementsPersistent && <div className="v-alert">Ordinary review acknowledgements are saved only on this browser device and are not shared or authenticated. Use the authenticated approval panel in requirement details if your account has reviewer access.</div>}
      <section className="release-summary-grid" aria-label="Release verification summary"><article className="release-summary-card"><span>INCOMPLETE / UNTESTED MODULES</span><b>{data.incompleteModules.length}</b><p>Includes partial implementation, blocked and untested requirements.</p><details><summary>List incomplete modules</summary><ul>{data.incompleteModules.map((module) => <li key={module.id}><span className={`status-chip ${module.status.toLowerCase()}`}>{labels[module.status]}</span><b>{module.id}</b><span>{module.requirement}</span></li>)}</ul></details></article><article className="release-summary-card"><span>ACTUAL RAILWAY VERIFICATION</span><b><i className={`status-chip ${(data.railwayVerification?.status ?? "NOT_TESTED").toLowerCase()}`}>{labels[data.railwayVerification?.status ?? "NOT_TESTED"]}</i></b><p>{data.railwayVerification?.actualResult ?? "No Railway verification evidence recorded."}</p><small>Deployment result: {labels[data.railwayVerification?.status ?? "NOT_TESTED"]} · Local evidence execution: {data.railwayVerification?.testExecutionStatus ?? "NOT_RUN"} · {data.railwayVerification?.testedAt ? new Date(data.railwayVerification.testedAt).toLocaleString() : "No evidence timestamp"}</small></article></section>
      <section className="release-issues"><div className="section-head"><div><span>RELEASE GATE</span><h2>Critical open items <small>{data.criticalIssues.length}</small></h2></div></div>{data.criticalIssues.length ? <><ul>{data.criticalIssues.slice(0, 8).map((issue) => <li key={issue.id}><span className={`status-chip ${issue.status.toLowerCase()}`}>{labels[issue.status]}</span><b>{issue.id}</b><span>{issue.requirement}</span><button onClick={() => { const found = data.items.find((item) => item.id === issue.id); if (found) setSelected(found); }}>Details →</button></li>)}</ul>{data.criticalIssues.length > 8 && <details className="more-critical"><summary>Show remaining {data.criticalIssues.length - 8} critical issues</summary><ul>{data.criticalIssues.slice(8).map((issue) => <li key={issue.id}><span className={`status-chip ${issue.status.toLowerCase()}`}>{labels[issue.status]}</span><b>{issue.id}</b><span>{issue.requirement}</span><button onClick={() => { const found = data.items.find((item) => item.id === issue.id); if (found) setSelected(found); }}>Details →</button></li>)}</ul></details>}</> : <p>Every critical check has PASS evidence.</p>}</section>
      <section className="checklist-area"><div className="section-head"><div><span>CHECKLIST · {data.sections.length} SECTIONS</span><h2>Evidence register</h2></div><div className="section-actions"><button className="v-button" onClick={() => setExpanded(Object.fromEntries(data.sections.map((section) => [section.id, true])))}>Expand all</button><button className="v-button" onClick={() => setExpanded({})}>Collapse all</button></div></div>
        <div className="check-tools"><input aria-label="Search requirements" placeholder="Search requirement, evidence, remediation…" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Filter by status" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="ALL">All statuses</option><option value="FAILED_BLOCKED">Failed or blocked</option><option value="UNTESTED">Not tested</option>{statuses.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select><input aria-label="Acknowledgement label" placeholder="Acknowledgement label (not verified)" value={reviewer} onChange={(event) => setReviewer(event.target.value)} /></div>
        {signedInUser && <p className="v-alert">Signed in as {signedInUser.email} ({signedInUser.role}). Authenticated approvals are separately stored and attributed to this account; the editable acknowledgement labels below are not sign-offs.</p>}
        <div className="export-row"><button onClick={() => void copySummary()}>Copy summary</button><button onClick={() => exportFile("json")}>Export JSON</button><button onClick={() => exportFile("csv")}>Export CSV</button><button onClick={() => exportFile("md")}>Export Markdown</button>{notice && <span role="status">{notice}</span>}</div>
        {visibleSections.map((section) => { const sectionIds = data.sections.find((candidate) => candidate.id === section.id)?.items.map((item) => item.id) ?? section.items.map((item) => item.id); const sectionReviewed = checkedRequirements(sectionIds, data.database.acknowledgements, reviewed, reviewerKey).size; const showCheckedProgress = ["planetary", "charts-vargas", "dasha-kp", "panchanga-transit", "accuracy-validation", "railway-db-security", "release"].includes(section.id); const compactNumber = section.number >= 5 && section.number <= 9; const sectionPassCount = section.items.filter((item) => item.status === "PASS").length; return <article className="verify-section" data-section={section.id} key={section.id}><button className="section-toggle" aria-expanded={Boolean(expanded[section.id])} onClick={() => setExpanded((old) => ({ ...old, [section.id]: !old[section.id] }))}><span className="section-number">{compactNumber ? `${section.number}.` : String(section.number).padStart(2, "0")}</span><span className="section-name"><b>{section.title}</b><small>{showCheckedProgress ? `${sectionReviewed}/${sectionIds.length} checked` : `${section.items.length} visible requirements · ${sectionPassCount} PASS`}{!compactNumber && showCheckedProgress && sectionPassCount > 0 ? ` · ${sectionPassCount} PASS` : ""}</small></span>{!showCheckedProgress && <span className="section-status">{sectionReviewed} reviewed</span>}<span aria-hidden>{expanded[section.id] ? "−" : "+"}</span></button>{expanded[section.id] && <div className="requirement-list">{section.items.map((item) => { const isReviewed = reviewedIds.has(item.id); return <div className="requirement-row" key={item.id}><button className="requirement-open" onClick={() => setSelected(item)}><span className={`status-chip ${item.status.toLowerCase()}`}>{labels[item.status]}</span><span className="requirement-title"><b>{item.id}</b> {item.requirement}{item.critical && <em>CRITICAL</em>}</span><span className="row-arrow">↗</span></button><label className="review-check"><input type="checkbox" aria-label={`${isReviewed ? "Uncheck" : "Check"} reviewer acknowledgement for ${item.id}`} checked={isReviewed} onChange={() => { if (!isReviewed) void acknowledge(item); else void unacknowledge(item); }} /> Reviewed</label></div>; })}</div>}</article>; })}
      </section>
      {data.lastRun && <details className="run-details"><summary>Recorded run commands · {data.lastRun.runId}</summary>{data.lastRun.checks.map((check) => <div key={check.command}><b>{check.command} — {check.status}</b><pre>{`Exit code: ${check.exitCode ?? "unknown"}${check.completedAt ? ` · Completed ${new Date(check.completedAt).toLocaleString()}` : ""}`}</pre></div>)}</details>}
      <div className="verify-footer" role="note">Technical statuses are set by linked execution evidence. Reviewer acknowledgements never set PASS. Independent reference validation and deployment checks remain explicit release gates.</div>
    </>}
    {selected && <div className="detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><aside className="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-heading"><button className="detail-close" aria-label="Close details" onClick={() => setSelected(null)}>×</button><p className="verify-eyebrow">REQUIREMENT · {selected.id}</p><h2 id="detail-heading">{selected.requirement}</h2><span className={`status-chip ${selected.status.toLowerCase()}`}>{labels[selected.status]}{selected.critical ? " · CRITICAL" : ""}</span><dl><dt>Implementation status</dt><dd>{selected.implementationStatus}</dd><dt>Test execution status</dt><dd>{selected.testExecutionStatus}</dd><dt>Verification method</dt><dd>{selected.method}</dd><dt>Actual verification result</dt><dd>{selected.actualResult}</dd><dt>Evidence reference</dt><dd><code>{selected.evidenceReference}</code></dd><dt>Last verification timestamp</dt><dd>{selected.testedAt ? new Date(selected.testedAt).toLocaleString() : "No linked execution recorded"}</dd>{selected.note && <><dt>Notes</dt><dd>{selected.note}</dd></>}</dl><div className="remediation"><b>Next action</b><p>{selected.remediation}</p></div><h3>Authenticated approvals</h3>{approvals.filter((approval) => approval.requirementId === selected.id).map((approval) => <p key={approval.id}>Your approval · {new Date(approval.approvedAt).toLocaleString()}</p>)}{signedInUser && ["DEVELOPER", "ADMIN", "SUPER_ADMIN"].includes(signedInUser.role) && <button className="v-button" disabled={busy} onClick={() => void setApproval(selected, approvals.some((approval) => approval.requirementId === selected.id))}>{approvals.some((approval) => approval.requirementId === selected.id) ? "Remove my authenticated approval" : "Approve as signed-in reviewer"}</button>}<p className="detail-rule">Ordinary acknowledgement labels only record that an item was read. Authenticated approvals are separate, visible only to their signed-in reviewer, and do not set technical PASS.</p></aside></div>}
  </div></main>;
}
