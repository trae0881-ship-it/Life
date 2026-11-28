export const SUPER_ADMIN_REPORT_PAGE_SIZE = 25;
export const ADMIN_REPORT_TYPES = ["VEDIC", "KP", "COMBINED"] as const;
export type AdminReportType = (typeof ADMIN_REPORT_TYPES)[number];

export type AdminReportFilters = {
  page: number;
  query: string;
  reportType: AdminReportType | null;
};

export function parseAdminReportFilters(params: URLSearchParams):
  | { ok: true; value: AdminReportFilters }
  | { ok: false } {
  const allowed = new Set(["page", "q", "reportType"]);
  if ([...params.keys()].some((key) => !allowed.has(key))
    || [...allowed].some((key) => params.getAll(key).length > 1)) return { ok: false };

  const rawPage = params.get("page") ?? "1";
  if (!/^[1-9]\d{0,5}$/.test(rawPage)) return { ok: false };
  const page = Number(rawPage);
  if (!Number.isSafeInteger(page) || page > 100_000) return { ok: false };

  const query = params.get("q")?.trim() ?? "";
  if (query.length > 100) return { ok: false };
  const rawReportType = params.get("reportType");
  const reportType = rawReportType && rawReportType !== "ALL"
    ? ADMIN_REPORT_TYPES.find((type) => type === rawReportType)
    : undefined;
  if (rawReportType && rawReportType !== "ALL" && !reportType) return { ok: false };

  return { ok: true, value: { page, query, reportType: reportType ?? null } };
}
