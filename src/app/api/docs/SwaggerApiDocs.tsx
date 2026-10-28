"use client";

import { useState } from "react";

type RequestMethod = "GET" | "POST";

type ApiOperationProps = {
  method: RequestMethod;
  path: string;
  summary: string;
  responses: string[];
  requiresSession: boolean;
  requestExample?: unknown;
  apiKey?: string;
};

function ApiOperation({ method, path, summary, responses, requiresSession, requestExample, apiKey = "" }: ApiOperationProps) {
  const [query, setQuery] = useState(path === "/api/locations" ? "Lahore" : "");
  const [body, setBody] = useState(requestExample === undefined ? "" : JSON.stringify(requestExample, null, 2));
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function sendRequest() {
    setIsLoading(true);
    setResult("");

    try {
      const url = path === "/api/locations" && query.trim()
        ? `${path}?q=${encodeURIComponent(query.trim())}`
        : path;
      const headers = new Headers();
      if (method === "POST") headers.set("Content-Type", "application/json");
      if (apiKey.trim()) headers.set("Authorization", `Bearer ${apiKey.trim()}`);
      const response = await fetch(url, {
        method,
        credentials: "same-origin",
        headers,
        body: method === "POST" ? body : undefined,
      });
      const responseBody = await response.text();
      setResult(`HTTP ${response.status} ${response.statusText}\n${responseBody}`);
    } catch (error) {
      setResult(`Request failed: ${error instanceof Error ? error.message : "Unexpected network error."}`);
    } finally {
      setIsLoading(false);
    }
  }

  return <details className="api-operation">
    <summary className="api-operation-summary">
      <span className={`api-method api-method-${method.toLowerCase()}`}>{method}</span>
      <code>{path}</code>
      <span>{summary}</span>
    </summary>
    <div className="api-operation-content">
      <p>Expected responses: {responses.join(", ")}{requiresSession ? " · LIFE session required" : " · No session required"}</p>
      {path === "/api/locations" && <label className="api-request-field">
        Search query
        <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={80} />
      </label>}
      {method === "POST" && <label className="api-request-field">
        JSON request body
        <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={12} spellCheck={false} />
      </label>}
      <button className="api-send-request" type="button" onClick={sendRequest} disabled={isLoading || (method === "POST" && !body.trim())}>
        {isLoading ? "Sending…" : "Try this request"}
      </button>
      {result && <pre className="api-response" role="status" aria-label={`Response for ${method} ${path}`}>{result}</pre>}
    </div>
  </details>;
}

export default function SwaggerApiDocs({
  operations,
}: {
  operations: ApiOperationProps[];
}) {
  const [apiKey, setApiKey] = useState("");
  return <main className="swagger-page">
    <header className="developers-header">
      <a href="/">✳ LIFE</a>
      <nav aria-label="API documentation"><a href="/developers">Developer portal</a><a href="/api/openapi.json">Raw OpenAPI JSON</a></nav>
    </header>
    <section className="swagger-intro">
      <p className="super-admin-eyebrow">OPENAPI 3.1 · INTERACTIVE API DOCS</p>
      <h1>LIFE API documentation</h1>
      <p>Documented routes are generated from implemented handlers. Requests are sent to this LIFE application only. Protected operations accept a signed-in LIFE session or a scoped API key.</p>
    </section>
    <label className="api-key-input">API key for this browser tab (not saved)
      <input type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
    </label>
    <section className="api-operation-list" aria-label="Documented API operations">
      {operations.map((operation) => <ApiOperation key={`${operation.method}:${operation.path}`} {...operation} apiKey={apiKey} />)}
    </section>
  </main>;
}
