import type { UserRole } from "./auth-core.ts";
import { isSameOriginMutation } from "./same-origin.ts";
import { readJson, RequestBodyError } from "./request-body.ts";
import { checkRateLimit } from "./rate-limit.ts";
import {
  auditHistoryCsv,
  getSeoDashboardData,
  runSeoAudit,
  saveSeoPageSettings,
} from "./seo-management.ts";

type Authorization = {
  status: 200 | 401 | 403;
  user: { id: string } | null;
};

type Dependencies = {
  authorize(request: Request, allowed: readonly UserRole[]): Promise<Authorization>;
  storePath?: string;
  runAudit?: () => ReturnType<typeof runSeoAudit>;
};

function denied(status: 401 | 403) {
  return Response.json(
    {
      error: status === 401 ? "Sign in is required." : "Super Admin access is required.",
      code: status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

async function authorize(request: Request, dependencies: Dependencies) {
  const result = await dependencies.authorize(request, ["SUPER_ADMIN"]);
  if (result.status !== 200 || !result.user) return denied(result.status === 401 ? 401 : 403);
  return null;
}

export async function handleSeoManagement(request: Request, dependencies: Dependencies) {
  const deniedResponse = await authorize(request, dependencies);
  if (deniedResponse) return deniedResponse;

  if (request.method === "GET") {
    try {
      return Response.json(await getSeoDashboardData(dependencies.storePath), {
        headers: { "Cache-Control": "no-store" },
      });
    } catch {
      return Response.json({ error: "SEO settings could not be loaded.", code: "SEO_STORAGE_UNAVAILABLE" }, { status: 503 });
    }
  }

  if (request.method !== "PATCH") {
    return Response.json({ error: "Method not allowed.", code: "METHOD_NOT_ALLOWED" }, { status: 405 });
  }
  if (!isSameOriginMutation(request)) {
    return Response.json({ error: "Request origin is not allowed.", code: "INVALID_ORIGIN" }, { status: 403 });
  }

  try {
    const body = await readJson(request);
    if (!body || !("page" in body)) {
      return Response.json({ error: "SEO page metadata is required.", code: "INVALID_INPUT" }, { status: 422 });
    }
    const settings = await saveSeoPageSettings(body.page, dependencies.storePath);
    if (!settings) {
      return Response.json({ error: "SEO metadata is invalid or the route is not managed.", code: "INVALID_INPUT" }, { status: 422 });
    }
    return Response.json({ page: settings }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return Response.json(
        { error: error.message, code: error.status === 413 ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON" },
        { status: error.status },
      );
    }
    return Response.json({ error: "SEO settings could not be saved.", code: "SEO_STORAGE_UNAVAILABLE" }, { status: 503 });
  }
}

export async function handleSeoAudit(request: Request, dependencies: Dependencies) {
  const authorization = await dependencies.authorize(request, ["SUPER_ADMIN"]);
  if (authorization.status !== 200 || !authorization.user) {
    return denied(authorization.status === 401 ? 401 : 403);
  }
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed.", code: "METHOD_NOT_ALLOWED" }, { status: 405 });
  }
  if (!isSameOriginMutation(request)) {
    return Response.json({ error: "Request origin is not allowed.", code: "INVALID_ORIGIN" }, { status: 403 });
  }
  const limit = checkRateLimit(`seo-audit:${authorization.user.id}`, 2, 60_000);
  if (!limit.allowed) {
    return Response.json(
      { error: "SEO audit rate limit reached. Please wait before running another audit.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const audit = dependencies.runAudit
      ? await dependencies.runAudit()
      : await runSeoAudit({ storePath: dependencies.storePath });
    return Response.json({ audit }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "The local technical SEO audit could not complete.", code: "SEO_AUDIT_FAILED" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function handleSeoExport(request: Request, dependencies: Dependencies) {
  const deniedResponse = await authorize(request, dependencies);
  if (deniedResponse) return deniedResponse;
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed.", code: "METHOD_NOT_ALLOWED" }, { status: 405 });
  }

  try {
    const data = await getSeoDashboardData(dependencies.storePath);
    return new Response(auditHistoryCsv(data.audits), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="life-seo-audit-history.csv"',
      },
    });
  } catch {
    return Response.json({ error: "SEO audit history could not be exported.", code: "SEO_STORAGE_UNAVAILABLE" }, { status: 503 });
  }
}
