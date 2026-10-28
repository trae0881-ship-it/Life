import type { UserRole } from "./auth-core.ts";

type Authorization = {
  status: 200 | 401 | 403;
  user: { id: string } | null;
};

type HealthStatus = {
  engine: "ready" | "unavailable";
  database: "connected" | "not-configured" | "unreachable";
};

type Dependencies = {
  authorize(request: Request, allowed: readonly UserRole[]): Promise<Authorization>;
  health(): Promise<HealthStatus>;
};

export async function handleSuperAdminHealth(request: Request, dependencies: Dependencies) {
  const auth = await dependencies.authorize(request, ["SUPER_ADMIN"]);
  if (auth.status !== 200 || !auth.user) {
    const status = auth.status === 401 ? 401 : 403;
    return Response.json(
      {
        error: status === 401 ? "Sign in is required." : "Super Admin access is required.",
        code: status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const health = await dependencies.health();
    const engine = health.engine === "ready" ? "ready" : "unavailable";
    const database = ["connected", "not-configured", "unreachable"].includes(health.database)
      ? health.database
      : "unreachable";
    return Response.json({ engine, database }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { engine: "unavailable", database: "unreachable" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
