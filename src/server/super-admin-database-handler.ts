import type { UserRole } from "./auth-core.ts";
import type { DatabaseInitialization } from "./database-initialization.ts";
import type { getLaunchReadiness } from "./launch-readiness.ts";

type Authorization = {
  status: 200 | 401 | 403;
  user: { id: string } | null;
};

type Dependencies = {
  authorize(request: Request, allowed: readonly UserRole[]): Promise<Authorization>;
  inspect(): Promise<DatabaseInitialization & { readiness: ReturnType<typeof getLaunchReadiness> }>;
};

export async function handleSuperAdminDatabase(request: Request, dependencies: Dependencies) {
  try {
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

    return Response.json(await dependencies.inspect(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Super Admin database status request failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Database status is temporarily unavailable.", code: "DATABASE_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
