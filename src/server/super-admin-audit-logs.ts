import { isValidDateOnly } from "../calculation/date-only.ts";

export const SUPER_ADMIN_AUDIT_ACTIONS = ["USER_LIST_READ", "USER_FILTERED_READ", "USER_ROLE_CHANGED", "BOOTSTRAP_SUPER_ADMIN"] as const;
export type SuperAdminAuditAction = (typeof SUPER_ADMIN_AUDIT_ACTIONS)[number];

const MAX_PAGE = 100_000;

export type SuperAdminAuditFilters = {
  page: number;
  action: SuperAdminAuditAction | null;
  startDate: string | null;
  endDate: string | null;
};

export type SuperAdminAuditEvent = {
  id: string;
  actorUserId: string | null;
  actorLabel: string | null;
  action: SuperAdminAuditAction;
  page: number;
  resultCount: number;
  targetUserId: string | null;
  fromRole: string | null;
  toRole: string | null;
  createdAt: Date;
};

export function parseSuperAdminAuditFilters(params: URLSearchParams):
  | { ok: true; value: SuperAdminAuditFilters }
  | { ok: false } {
  const allowed = new Set(["page", "action", "startDate", "endDate"]);
  if ([...params.keys()].some((key) => !allowed.has(key))) return { ok: false };
  if ([...allowed].some((key) => params.getAll(key).length > 1)) return { ok: false };

  const rawPage = params.get("page") ?? "1";
  if (!/^[1-9]\d{0,5}$/.test(rawPage)) return { ok: false };
  const page = Number(rawPage);
  if (page > MAX_PAGE) return { ok: false };

  const rawAction = params.get("action");
  const action = rawAction && rawAction !== "ALL"
    ? SUPER_ADMIN_AUDIT_ACTIONS.find((candidate) => candidate === rawAction)
    : undefined;
  if (rawAction && rawAction !== "ALL" && !action) return { ok: false };

  const startDate = params.get("startDate");
  const endDate = params.get("endDate");
  if ((startDate !== null && (!startDate || !isValidDateOnly(startDate)))
    || (endDate !== null && (!endDate || !isValidDateOnly(endDate)))) return { ok: false };
  if (startDate && endDate && startDate > endDate) return { ok: false };

  return {
    ok: true,
    value: {
      page,
      action: action ?? null,
      startDate,
      endDate,
    },
  };
}

export function auditLogWhere(filters: SuperAdminAuditFilters) {
  const endDateExclusive = filters.endDate
    ? new Date(new Date(`${filters.endDate}T00:00:00.000Z`).getTime() + 86_400_000)
    : null;
  return {
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.startDate || filters.endDate
      ? {
        createdAt: {
          ...(filters.startDate ? { gte: new Date(`${filters.startDate}T00:00:00.000Z`) } : {}),
          ...(endDateExclusive ? { lt: endDateExclusive } : {}),
        },
      }
      : {}),
  };
}
