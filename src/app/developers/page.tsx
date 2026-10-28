import type { Metadata } from "next";
import { LIFE_OPENAPI } from "@/server/openapi";
import "../super-admin/super-admin.css";

export const metadata: Metadata = {
  title: "Developers | LIFE API",
  description: "Verified LIFE API route documentation, access rules, rate limits and safe integration examples.",
};

type DevelopersPageProps = { searchParams: Promise<{ access?: string | string[] }> };

export default async function DevelopersPage({ searchParams }: DevelopersPageProps) {
  const params = await searchParams;
  const accessState = typeof params.access === "string" ? params.access : undefined;
  const accessMessage = accessState === "developer-required"
    ? "This signed-in account does not have Developer permissions. Sign in with an approved Developer account or contact the authorized administrator."
    : accessState === "approval-required"
      ? "Your LIFE account has standard access. Developer role and product access require separate approval by an authorized administrator."
      : null;
  const operations = Object.entries(LIFE_OPENAPI.paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, operation]) => ({
      path,
      method: method.toUpperCase(),
      summary: operation.summary,
      auth: "security" in operation ? "LIFE session required" : "No session required",
      responses: Object.keys(operation.responses),
    })),
  );

  return <main className="developers-page">
    <header className="developers-header"><a href="/">✳ LIFE</a><nav aria-label="Developer navigation"><a href="/developer/login?next=%2Fdevelopers%2Fdashboard">Developer Login</a><a href="/developer/signup">Create Developer Account</a><a href="/developers/dashboard">Developer dashboard</a><a href="/api/docs">Interactive API docs</a><a href="/api/openapi.json">OpenAPI JSON</a></nav></header>
    {accessMessage && <p className="developers-note" role="status">{accessMessage}</p>}
    <section className="developers-hero">
      <p className="super-admin-eyebrow">LIFE · DEVELOPERS</p>
      <h1>Build with LIFE’s documented API</h1>
      <p>LIFE exposes application endpoints for local chart calculations and supporting features. These routes use the existing LIFE application access model; they are not a public developer platform.</p>
      <a className="developers-primary" href="/api/docs">Explore verified endpoints</a>
    </section>
    <section className="developers-section">
      <h2>Access model</h2>
      <ul>
        <li><strong>Health:</strong> application readiness information, without chart data.</li>
        <li><strong>Locations, charts and transits:</strong> require a signed-in LIFE account or a scoped API key.</li>
        <li><strong>Private charts, profiles and saved records:</strong> remain session-bound and are not available through an external API-key program.</li>
        <li><strong>Super Admin routes:</strong> remain role-restricted and are excluded from developer documentation.</li>
      </ul>
      <p>API keys are managed in the authenticated developer dashboard and are displayed once at creation. OAuth and external developer account registration are not available. Never use a database URL, Supabase service key or session cookie as an API key.</p>
    </section>
    <section className="developers-section">
      <h2>Verified endpoint catalogue</h2>
      <div className="developers-table-wrap"><table className="developers-table">
        <thead><tr><th>Method</th><th>Path</th><th>Purpose</th><th>Access</th><th>Responses</th></tr></thead>
        <tbody>{operations.map((operation) => <tr key={`${operation.method}:${operation.path}`}>
          <td><code>{operation.method}</code></td><td><code>{operation.path}</code></td><td>{operation.summary}</td><td>{operation.auth}</td><td>{operation.responses.join(", ")}</td>
        </tr>)}</tbody>
      </table></div>
      <p className="developers-note">Error responses use a JSON object containing an <code>error</code> message and stable <code>code</code>; some validation responses include <code>details</code>. Refer to the OpenAPI document for request schemas, examples and route-specific responses.</p>
    </section>
    <section className="developers-section developers-grid">
      <article><h2>Usage and rate limits</h2><p>Current in-process limits include 20 chart calculations/minute, 12 transit calculations/minute, and 30 gazetteer searches/minute per request identity. Limits are operational protections, not an availability commitment.</p></article>
      <article><h2>Versioning and deprecation</h2><p>The API is currently unversioned and has no published compatibility or deprecation guarantee. Check the OpenAPI version and application release before relying on a route.</p></article>
      <article><h2>Onboarding</h2><p>Sign in with a LIFE Developer account and use a key issued for a product grant. Super Admin controls product access; Admins can manage keys only within explicitly granted authority.</p></article>
      <article><h2>Safe examples</h2><pre><code>{`BASE_URL="https://your-deployment-host"\ncurl -X POST "$BASE_URL/api/charts" \\\n  -H "Content-Type: application/json" \\\n  -d '{"localDate":"1990-05-15","localTime":"10:30","timeZone":"Asia/Kolkata","latitude":19.076,"longitude":72.8777}'`}</code></pre><p>Replace the sample origin with this deployment's HTTPS origin. Example data is fictional; requests require an authenticated browser session or an appropriately scoped API key.</p></article>
    </section>
  </main>;
}
