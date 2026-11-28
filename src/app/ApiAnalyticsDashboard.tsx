"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type UsageAnalytics = {
  range: { from: string; to: string; granularity: string; retainedDetailDays: number };
  summary: { totalRequests: number; successfulRequests: number; errorRequests: number; successRate: number; averageResponseTimeMs: number | null };
  trend: { bucket: string; requests: number; errors: number; averageResponseTimeMs: number | null }[];
  endpoints: { endpoint: string; requests: number; errors: number }[];
  statuses: { statusCode: number; requests: number }[];
  products: { id: string; name: string; requests: number; errors: number }[];
  developers: { id: string; name: string | null; email: string; requests: number; errors: number }[];
  lifetimeMonthlyCounters: { requests: number; errors: number };
};
type FilterDraft = { from: string; to: string; granularity: string; developerId: string; productId: string; endpoint: string; statusCode: string; planId: string };
const emptyAnalytics: UsageAnalytics = {
  range: { from: "", to: "", granularity: "daily", retainedDetailDays: 90 },
  summary: { totalRequests: 0, successfulRequests: 0, errorRequests: 0, successRate: 0, averageResponseTimeMs: null },
  trend: [], endpoints: [], statuses: [], products: [], developers: [], lifetimeMonthlyCounters: { requests: 0, errors: 0 },
};

export default function ApiAnalyticsDashboard({ superAdmin = false }: { superAdmin?: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [filters, setFilters] = useState<FilterDraft>({
    from: monthAgo, to: today, granularity: "daily", developerId: "", productId: "", endpoint: "", statusCode: "", planId: "",
  });
  const [draft, setDraft] = useState(filters);
  const [data, setData] = useState<UsageAnalytics>(emptyAnalytics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (selected: FilterDraft) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(selected)) if (value) params.set(key, value);
    try {
      const response = await fetch(`/api/platform/analytics?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "API usage analytics could not be loaded.");
      setData(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "API usage analytics could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(filters); }, [filters, load]);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters(draft);
  }

  const cards = [
    ["API-key requests", data.summary.totalRequests.toLocaleString()],
    ["Successful", data.summary.successfulRequests.toLocaleString()],
    ["Errors", data.summary.errorRequests.toLocaleString()],
    ["Success rate", `${data.summary.successRate.toFixed(2)}%`],
    ["Average response", data.summary.averageResponseTimeMs === null ? "—" : `${data.summary.averageResponseTimeMs.toFixed(1)} ms`],
  ];

  return <div className="super-admin-content">
    <nav className="api-ecosystem-nav" aria-label="API platform navigation">
      {superAdmin ? <><a href="/super-admin">Super Admin home</a><a href="/super-admin/api-products">Products</a><a href="/super-admin/developers">Developers</a><a href="/super-admin/api-billing">Plans & billing</a></>
        : <><a href="/developers">Developer portal</a><a href="/developers/dashboard">Products & keys</a><a href="/developers/subscription">Plans & billing</a><a href="/api/docs">API docs</a></>}
    </nav>
    <p className="super-admin-eyebrow">API PLATFORM · OBSERVABILITY</p>
    <h1>API usage analytics</h1>
    <p className="super-admin-description">
      {superAdmin ? "Monitor API-key requests across verified Developers." : "Review request volume and errors for your own API keys."}
      {" "}Detailed request events are retained for 90 days; monthly quota counters are shown separately.
    </p>
    <form className="api-analytics-filters" onSubmit={apply}>
      <label>From (UTC)<input type="date" value={draft.from} onChange={(event) => setDraft((old) => ({ ...old, from: event.target.value }))} /></label>
      <label>To (UTC)<input type="date" value={draft.to} onChange={(event) => setDraft((old) => ({ ...old, to: event.target.value }))} /></label>
      <label>Interval<select value={draft.granularity} onChange={(event) => setDraft((old) => ({ ...old, granularity: event.target.value }))}>
        <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
      </select></label>
      {superAdmin && <label>Developer ID<input value={draft.developerId} onChange={(event) => setDraft((old) => ({ ...old, developerId: event.target.value }))} /></label>}
      <label>Product ID<input value={draft.productId} onChange={(event) => setDraft((old) => ({ ...old, productId: event.target.value }))} /></label>
      <label>Endpoint<select value={draft.endpoint} onChange={(event) => setDraft((old) => ({ ...old, endpoint: event.target.value }))}>
        <option value="">All endpoints</option>
        <option>GET /api/health</option><option>GET /api/locations</option><option>POST /api/charts</option><option>POST /api/transits</option><option>GET /api/developer/test</option>
      </select></label>
      <label>HTTP status<input inputMode="numeric" maxLength={3} value={draft.statusCode} onChange={(event) => setDraft((old) => ({ ...old, statusCode: event.target.value.replace(/\D/g, "") }))} placeholder="e.g. 429" /></label>
      <label>Plan ID<input value={draft.planId} onChange={(event) => setDraft((old) => ({ ...old, planId: event.target.value }))} /></label>
      <button disabled={loading} type="submit">Apply filters</button>
    </form>
    {error && <div className="super-admin-error" role="alert"><p>{error}</p><button onClick={() => void load(filters)} type="button">Retry</button></div>}
    {loading && <p className="super-admin-state" role="status">Loading API analytics…</p>}
    <div className="super-admin-metrics api-analytics-metrics">{cards.map(([label, value]) => <article className="super-admin-card" key={label}><h2>{label}</h2><p>{value}</p></article>)}</div>
    <p className="api-analytics-counter">All-time accepted requests in monthly quota counters: {data.lifetimeMonthlyCounters.requests.toLocaleString()} · errors: {data.lifetimeMonthlyCounters.errors.toLocaleString()}</p>
    <section className="api-analytics-section">
      <h2>Requests over time</h2>
      <div className="developers-table-wrap"><table className="developers-table">
        <thead><tr><th>Period (UTC)</th><th>Requests</th><th>Errors</th><th>Average response</th></tr></thead>
        <tbody>{data.trend.map((row) => <tr key={row.bucket}><td>{new Date(row.bucket).toLocaleDateString()}</td><td>{row.requests.toLocaleString()}</td><td>{row.errors.toLocaleString()}</td><td>{row.averageResponseTimeMs === null ? "—" : `${row.averageResponseTimeMs.toFixed(1)} ms`}</td></tr>)}
          {!data.trend.length && !loading && <tr><td colSpan={4}>No API-key requests were recorded in this period.</td></tr>}</tbody>
      </table></div>
    </section>
    <section className="api-analytics-section">
      <h2>Endpoint and status breakdown</h2>
      <div className="api-analytics-columns">
        <div className="developers-table-wrap"><table className="developers-table"><thead><tr><th>Endpoint</th><th>Requests</th><th>Errors</th></tr></thead>
          <tbody>{data.endpoints.map((row) => <tr key={row.endpoint}><td><code>{row.endpoint}</code></td><td>{row.requests.toLocaleString()}</td><td>{row.errors.toLocaleString()}</td></tr>)}
            {!data.endpoints.length && <tr><td colSpan={3}>No endpoint data.</td></tr>}</tbody>
        </table></div>
        <div className="developers-table-wrap"><table className="developers-table"><thead><tr><th>HTTP status</th><th>Requests</th></tr></thead>
          <tbody>{data.statuses.map((row) => <tr key={row.statusCode}><td>{row.statusCode}</td><td>{row.requests.toLocaleString()}</td></tr>)}
            {!data.statuses.length && <tr><td colSpan={2}>No status data.</td></tr>}</tbody>
        </table></div>
      </div>
    </section>
    <section className="api-analytics-section">
      <h2>Products by usage</h2>
      <div className="developers-table-wrap"><table className="developers-table"><thead><tr><th>Product</th><th>Product ID</th><th>Requests</th><th>Errors</th></tr></thead>
        <tbody>{data.products.map((row) => <tr key={row.id}><td>{row.name}</td><td><code>{row.id}</code></td><td>{row.requests.toLocaleString()}</td><td>{row.errors.toLocaleString()}</td></tr>)}
          {!data.products.length && <tr><td colSpan={4}>No product usage data.</td></tr>}</tbody>
      </table></div>
    </section>
    {superAdmin && <section className="api-analytics-section">
      <h2>Developer usage</h2>
      <div className="developers-table-wrap"><table className="developers-table"><thead><tr><th>Developer</th><th>Developer ID</th><th>Requests</th><th>Errors</th></tr></thead>
        <tbody>{data.developers.map((row) => <tr key={row.id}><td>{row.name || row.email}<br /><small>{row.email}</small></td><td><code>{row.id}</code></td><td>{row.requests.toLocaleString()}</td><td>{row.errors.toLocaleString()}</td></tr>)}
          {!data.developers.length && <tr><td colSpan={4}>No Developer usage data.</td></tr>}</tbody>
      </table></div>
    </section>}
  </div>;
}
