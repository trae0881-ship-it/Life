"use client";

import { useEffect, useState, type FormEvent } from "react";

type Placement = "HEAD" | "BODY_START" | "BODY_END";
type ManagedScript = {
  id: string;
  name: string;
  snippet: string;
  placement: Placement;
  enabled: boolean;
  targetPaths: string[];
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
};
type AuditEvent = {
  id: string;
  scriptId: string;
  scriptName: string;
  actorUserId: string;
  action: "CREATED" | "UPDATED" | "ENABLED" | "DISABLED" | "DELETED";
  createdAt: string;
};
type Draft = { name: string; snippet: string; placement: Placement; enabled: boolean; targetPaths: string };
const emptyDraft = (): Draft => ({ name: "", snippet: "", placement: "BODY_END", enabled: false, targetPaths: "" });

export default function AdminScriptManager({ email, role }: { email: string; role: "ADMIN" | "SUPER_ADMIN" }) {
  const [scripts, setScripts] = useState<ManagedScript[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState("");
  const [siteWide, setSiteWide] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadScripts() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/scripts", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.scripts) || !Array.isArray(result.auditEvents)) throw new Error(result.error ?? "Script entries could not be loaded.");
      setScripts(result.scripts);
      setAuditEvents(result.auditEvents);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Script entries could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadScripts(); }, []);

  function edit(script: ManagedScript) {
    setEditingId(script.id);
    setSiteWide(script.targetPaths === null);
    setDraft({
      name: script.name,
      snippet: script.snippet,
      placement: script.placement,
      enabled: script.enabled,
      targetPaths: script.targetPaths.join("\n"),
    });
    setNotice("");
    setError("");
  }

  function resetForm() {
    setEditingId("");
    setSiteWide(true);
    setDraft(emptyDraft());
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const targetPaths = siteWide
      ? null
      : [...new Set(draft.targetPaths.split(/\r?\n/).map((path) => path.trim()).filter(Boolean))];
    try {
      const response = await fetch(editingId ? `/api/admin/scripts/${encodeURIComponent(editingId)}` : "/api/admin/scripts", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, targetPaths }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Script entry could not be saved.");
      await loadScripts();
      resetForm();
      setNotice(editingId ? "Script entry updated." : "Script entry created.");
      window.dispatchEvent(new Event("life-managed-scripts-changed"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Script entry could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(script: ManagedScript) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/scripts/${encodeURIComponent(script.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !script.enabled }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Script status could not be changed.");
      await loadScripts();
      setNotice(`Script ${!script.enabled ? "enabled" : "disabled"}.`);
      window.dispatchEvent(new Event("life-managed-scripts-changed"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Script status could not be changed.");
    }
  }

  async function remove(script: ManagedScript) {
    if (!window.confirm(`Delete “${script.name}”? This cannot be undone.`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/scripts/${encodeURIComponent(script.id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || result.deleted !== true) throw new Error(result.error ?? "Script entry could not be deleted.");
      await loadScripts();
      if (editingId === script.id) resetForm();
      setNotice("Script entry deleted.");
      window.dispatchEvent(new Event("life-managed-scripts-changed"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Script entry could not be deleted.");
    }
  }

  return <main className="super-admin-shell">
    <aside className="super-admin-sidebar">
      <a className="super-admin-brand" href="/admin">Administrator<small>LIFE · OPERATIONS</small></a>
      <p className="super-admin-identity"><span>Signed in as · {role}</span><b>{email}</b></p>
      <nav className="super-admin-nav" aria-label="Administrator navigation">
        <a href="/admin">Admin overview</a>
        <a href="/super-admin">Super Admin overview</a>
        <a aria-current="page" className="active" href="/admin/scripts">Head / body scripts</a>
      </nav>
      <div className="super-admin-sidebar-foot"><a href="/">LIFE home</a><a href="/dashboard">User dashboard</a></div>
    </aside>
    <section className="super-admin-main">
      <header className="super-admin-topbar"><span>HEAD / BODY SCRIPT MANAGER</span><span>{role}</span></header>
      <div className="super-admin-content admin-script-content">
        <p className="super-admin-eyebrow">LIFE · SITE CONFIGURATION</p>
        <h1>Script manager</h1>
        <p className="super-admin-description">Manage trusted JavaScript for site pages. Scripts run in visitors’ browsers with that page’s permissions; only add code reviewed and approved by your organization.</p>
        <aside className="admin-script-warning" role="note">
          <strong>Privileged JavaScript — XSS capable</strong>
          <p>Enabled scripts can read or change page content and act with the current visitor’s browser session. Never store secrets here. Admin and Super Admin access is required; every mutation is origin-checked and audit-logged. Script contents are visible to visitors on pages where they run.</p>
        </aside>
        {error && <p className="super-admin-error" role="alert">{error}</p>}
        {notice && <p className="seo-message" role="status">{notice}</p>}

        <section className="developers-section admin-script-list" aria-labelledby="script-list-title">
          <div className="admin-script-list-heading"><h2 id="script-list-title">Configured entries</h2><button type="button" onClick={resetForm}>New script</button></div>
          {loading ? <p aria-live="polite">Loading script entries…</p> : scripts.length === 0
            ? <p>No script entries have been configured.</p>
            : <div className="super-admin-table-wrap"><table className="super-admin-user-table">
              <thead><tr><th>Name</th><th>Location</th><th>Target</th><th>Status</th><th>Modified</th><th>Actions</th></tr></thead>
              <tbody>{scripts.map((script) => <tr key={script.id}>
                <td>{script.name}</td><td>{script.placement}</td><td>{script.targetPaths.length ? script.targetPaths.join(", ") : "All pages"}</td>
                <td>{script.enabled ? "Enabled" : "Disabled"}</td><td><time dateTime={script.updatedAt}>{new Date(script.updatedAt).toLocaleString()}</time></td>
                <td className="admin-script-actions">
                  <button type="button" onClick={() => edit(script)}>View / edit</button>
                  <button type="button" onClick={() => void toggle(script)}>{script.enabled ? "Disable" : "Enable"}</button>
                  <button type="button" onClick={() => void remove(script)}>Delete</button>
                </td>
              </tr>)}</tbody>
            </table></div>}
        </section>

        <section className="developers-section" aria-labelledby="script-audit-title">
          <h2 id="script-audit-title">Recent script activity</h2>
          {auditEvents.length === 0 ? <p>No script changes have been recorded.</p> : <div className="super-admin-table-wrap"><table className="super-admin-user-table">
            <thead><tr><th>Time</th><th>Action</th><th>Script</th><th>Actor ID</th></tr></thead>
            <tbody>{auditEvents.map((event) => <tr key={event.id}>
              <td><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time></td>
              <td>{event.action}</td><td>{event.scriptName}</td><td><code>{event.actorUserId}</code></td>
            </tr>)}</tbody>
          </table></div>}
        </section>

        <section className="developers-section" aria-labelledby="script-form-title">
          <h2 id="script-form-title">{editingId ? "Edit script entry" : "Create script entry"}</h2>
          <form className="admin-script-form" onSubmit={(event) => void save(event)}>
            <label>Name<input required maxLength={100} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
            <label>Location<select value={draft.placement} onChange={(event) => setDraft((current) => ({ ...current, placement: event.target.value as Placement }))}>
              <option value="HEAD">HEAD</option><option value="BODY_START">BODY_START</option><option value="BODY_END">BODY_END</option>
            </select></label>
            <fieldset>
              <legend>Page targeting</legend>
              <label className="admin-script-check"><input type="checkbox" checked={siteWide} onChange={(event) => setSiteWide(event.target.checked)} />Run on all pages</label>
              {!siteWide && <label>Exact page paths, one per line<textarea required maxLength={9_000} rows={5} placeholder={"/\n/references"} value={draft.targetPaths} onChange={(event) => setDraft((current) => ({ ...current, targetPaths: event.target.value }))} /></label>}
            </fieldset>
            <label>JavaScript snippet<textarea required maxLength={16_000} rows={12} spellCheck={false} value={draft.snippet} onChange={(event) => setDraft((current) => ({ ...current, snippet: event.target.value }))} /></label>
            <label className="admin-script-check"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} />Enabled</label>
            <p>New scripts are syntax-checked but not sandboxed. Test and review the code before enabling it.</p>
            <div className="admin-script-form-actions"><button type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Create script"}</button>{editingId && <button type="button" onClick={resetForm}>Cancel edit</button>}</div>
          </form>
        </section>
      </div>
    </section>
  </main>;
}
