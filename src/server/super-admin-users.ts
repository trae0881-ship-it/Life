import type { UserRole } from "./auth-core.ts";

const roles: readonly UserRole[] = ["USER", "DEVELOPER", "ADMIN", "SUPER_ADMIN"];
const MAX_PAGE = 100_000;

export type SuperAdminUserFilters = {
  page: number;
  role: UserRole | null;
  query: string;
};

export function parseSuperAdminUserFilters(params: URLSearchParams):
  | { ok: true; value: SuperAdminUserFilters }
  | { ok: false } {
  const allowed = new Set(["page", "role", "q"]);
  if ([...params.keys()].some((key) => !allowed.has(key))) return { ok: false };
  if ([...allowed].some((key) => params.getAll(key).length > 1)) return { ok: false };

  const rawPage = params.get("page") ?? "1";
  if (!/^[1-9]\d{0,5}$/.test(rawPage)) return { ok: false };
  const page = Number(rawPage);
  if (page > MAX_PAGE) return { ok: false };

  const rawRole = params.get("role");
  const role = rawRole && rawRole !== "ALL"
    ? roles.find((candidate) => candidate === rawRole)
    : undefined;
  if (rawRole !== null && rawRole !== "ALL" && !role) return { ok: false };

  const query = (params.get("q") ?? "").trim();
  if ((params.has("q") && !query) || query.length > 254 || /[\u0000-\u001f\u007f]/.test(query)) return { ok: false };

  return {
    ok: true,
    value: {
      page,
      role: role ?? null,
      query,
    },
  };
}
