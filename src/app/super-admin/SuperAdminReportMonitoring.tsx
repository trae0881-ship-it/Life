"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { translate, type Language } from "@/presentation/language";

type ReportType = "VEDIC" | "KP" | "COMBINED";
type ReportRow = {
  id: string;
  title: string;
  reportType: ReportType;
  availableChartCount: number;
  createdAt: string;
  user: { id: string; email: string; fullName: string | null };
  profileLabel: string | null;
  birthDate: string | null;
  birthPlace: string | null;
};
type ReportFilters = { query: string; reportType: "ALL" | ReportType };
type ReportDetail = {
  id: string;
  title: string;
  reportType: ReportType;
  availableChartCount: number;
  createdAt: string;
  user: { id: string; email: string; fullName: string | null };
  profileId: string | null;
  profileLabel: string | null;
  birthDetails: { fullName: string | null; birthPlace: string | null; localDate: string | null; localTime: string | null };
  overview: { lagna: string | null; rashi: string | null; nakshatra: string | null; pada: number | null };
  planets: { name: string | null; sign: string | null; house: number | null; nakshatra: string | null; pada: number | null }[];
  houses: { house: number; sign: string }[];
  hasKpChart: boolean;
  availableSections: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isReportRow(value: unknown): value is ReportRow {
  if (!isRecord(value) || !isRecord(value.user)) return false;
  return typeof value.id === "string"
    && typeof value.title === "string"
    && ["VEDIC", "KP", "COMBINED"].includes(value.reportType as string)
    && Number.isSafeInteger(value.availableChartCount)
    && typeof value.createdAt === "string"
    && typeof value.user.id === "string"
    && typeof value.user.email === "string"
    && (value.user.fullName === null || typeof value.user.fullName === "string")
    && (value.profileLabel === null || typeof value.profileLabel === "string")
    && (value.birthDate === null || typeof value.birthDate === "string")
    && (value.birthPlace === null || typeof value.birthPlace === "string");
}

function isReportDetail(value: unknown): value is ReportDetail {
  if (!isRecord(value) || !isRecord(value.user) || !isRecord(value.birthDetails) || !isRecord(value.overview)) return false;
  return typeof value.id === "string"
    && typeof value.title === "string"
    && ["VEDIC", "KP", "COMBINED"].includes(value.reportType as string)
    && Number.isSafeInteger(value.availableChartCount)
    && typeof value.createdAt === "string"
    && typeof value.user.id === "string"
    && typeof value.user.email === "string"
    && Array.isArray(value.planets)
    && Array.isArray(value.houses)
    && typeof value.hasKpChart === "boolean"
    && Array.isArray(value.availableSections);
}

export default function SuperAdminReportMonitoring({ language }: { language: Language }) {
  const [query, setQuery] = useState("");
  const [reportType, setReportType] = useState<ReportFilters["reportType"]>("ALL");
  const [filters, setFilters] = useState<ReportFilters>({ query: "", reportType: "ALL" });
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [denied, setDenied] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const listRequest = useRef<AbortController | null>(null);

  const t = (key: string) => translate(language, key);
  const locale = language === "hi" ? "hi-IN" : language === "hinglish" ? "en-IN" : "en";

  const loadReports = useCallback(async (nextPage: number, nextFilters: ReportFilters) => {
    listRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    setLoading(true);
    setError(false);
    setDenied(false);
    try {
      const params = new URLSearchParams({ page: String(nextPage) });
      if (nextFilters.query) params.set("q", nextFilters.query);
      if (nextFilters.reportType !== "ALL") params.set("reportType", nextFilters.reportType);
      const response = await fetch(`/api/super-admin/kundali-reports?${params}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) {
        setDenied(true);
        return;
      }
      if (!response.ok) throw new Error("Report list request failed.");
      const body: unknown = await response.json();
      if (!isRecord(body) || !Array.isArray(body.reports)
        || !body.reports.every(isReportRow) || !Number.isSafeInteger(body.page)
        || !Number.isSafeInteger(body.pageCount) || !Number.isSafeInteger(body.total)) {
        throw new Error("Report list response was invalid.");
      }
      setReports(body.reports);
      setPage(body.page as number);
      setPageCount(body.pageCount as number);
      setTotal(body.total as number);
      setSelectedReport(null);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports(1, filters);
    return () => listRequest.current?.abort();
  }, [filters, loadReports]);

  async function loadDetail(reportId: string) {
    setSelectedReport(null);
    setDetailLoading(true);
    setDetailError(false);
    try {
      const response = await fetch(`/api/super-admin/kundali-reports/${encodeURIComponent(reportId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Report detail request failed.");
      const body: unknown = await response.json();
      if (!isRecord(body) || !isReportDetail(body.report)) throw new Error("Report detail response was invalid.");
      setSelectedReport(body.report);
    } catch {
      setDetailError(true);
    } finally {
      setDetailLoading(false);
    }
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({ query: query.trim(), reportType });
  }

  return <section aria-label={t("superAdmin.kundaliReports")} className="super-admin-reports">
    <p className="super-admin-description">{t("superAdmin.reportMonitorDescription")}</p>
    <p className="super-admin-report-readonly">{t("superAdmin.reportReadOnly")}</p>
    <form className="super-admin-report-filters" onSubmit={applyFilters}>
      <label><span>{t("superAdmin.reportSearch")}</span><input maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label><span>{t("superAdmin.reportTypeFilter")}</span><select value={reportType} onChange={(event) => setReportType(event.target.value as ReportFilters["reportType"])}>
        <option value="ALL">{t("superAdmin.reportType.all")}</option>
        <option value="VEDIC">{t("superAdmin.reportType.VEDIC")}</option>
        <option value="KP">{t("superAdmin.reportType.KP")}</option>
        <option value="COMBINED">{t("superAdmin.reportType.COMBINED")}</option>
      </select></label>
      <button type="submit">{t("superAdmin.search")}</button>
    </form>
    {loading && <p aria-live="polite" className="super-admin-state">{t("superAdmin.loading")}</p>}
    {error && <div className="super-admin-error" role="alert"><p>{t("superAdmin.reportListError")}</p><button type="button" onClick={() => void loadReports(page, filters)}>{t("superAdmin.retry")}</button></div>}
    {denied && <p className="super-admin-error" role="alert">{t("superAdmin.permissionDenied")}</p>}
    {detailError && <p className="super-admin-error" role="alert">{t("superAdmin.reportDetailError")}</p>}
    {detailLoading && <p aria-live="polite" className="super-admin-state">{t("superAdmin.loading")}</p>}
    {!loading && !error && !denied && reports.length === 0 && <p className="super-admin-unavailable" role="status">{t("superAdmin.reportNoResults")}</p>}
    {reports.length > 0 && <>
      <p className="super-admin-user-total">{total.toLocaleString(locale)} {t("superAdmin.kundaliReports")}</p>
      <div className="super-admin-table-wrap">
        <table className="super-admin-report-table">
          <thead><tr>
            <th>{t("account.chartTitle")}</th><th>{t("superAdmin.email")}</th><th>{t("superAdmin.reportBirthDate")}</th>
            <th>{t("superAdmin.reportTypeFilter")}</th><th>{t("superAdmin.reportChartsAvailable")}</th><th>{t("superAdmin.created")}</th><th>{t("superAdmin.reportAction")}</th>
          </tr></thead>
          <tbody>{reports.map((report) => <tr key={report.id}>
            <td>{report.title}</td>
            <td>{report.user.email}</td>
            <td>{report.birthDate ?? "—"}</td>
            <td>{t(`superAdmin.reportType.${report.reportType}`)}</td>
            <td>{report.availableChartCount}</td>
            <td><time dateTime={report.createdAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(report.createdAt))}</time></td>
            <td><button type="button" onClick={() => void loadDetail(report.id)}>{t("superAdmin.reportView")}</button></td>
          </tr>)}</tbody>
        </table>
      </div>
      <nav aria-label={t("superAdmin.kundaliReports")} className="super-admin-pagination">
        <button disabled={page <= 1 || loading} onClick={() => void loadReports(page - 1, filters)} type="button">{t("superAdmin.previous")}</button>
        <span>{t("superAdmin.page")} {page} / {pageCount}</span>
        <button disabled={page >= pageCount || loading} onClick={() => void loadReports(page + 1, filters)} type="button">{t("superAdmin.next")}</button>
      </nav>
    </>}
    {selectedReport && <section aria-labelledby="admin-report-detail-title" className="super-admin-report-detail">
      <div className="super-admin-report-detail-heading">
        <div><small>{t("superAdmin.reportReadOnly")}</small><h2 id="admin-report-detail-title">{selectedReport.title}</h2></div>
        <button type="button" onClick={() => setSelectedReport(null)}>{t("superAdmin.reportClose")}</button>
      </div>
      <dl className="super-admin-report-facts">
        <div><dt>{t("superAdmin.reportOwner")}</dt><dd>{selectedReport.user.fullName ?? selectedReport.user.email} · {selectedReport.user.email}</dd></div>
        <div><dt>{t("superAdmin.reportTypeFilter")}</dt><dd>{t(`superAdmin.reportType.${selectedReport.reportType}`)}</dd></div>
        <div><dt>{t("superAdmin.reportProfile")}</dt><dd>{selectedReport.profileLabel ?? "—"}</dd></div>
        <div><dt>{t("superAdmin.reportChartsAvailable")}</dt><dd>{selectedReport.availableChartCount}</dd></div>
        <div><dt>{t("superAdmin.reportBirthName")}</dt><dd>{selectedReport.birthDetails.fullName ?? "—"}</dd></div>
        <div><dt>{t("superAdmin.reportBirthPlace")}</dt><dd>{selectedReport.birthDetails.birthPlace ?? "—"}</dd></div>
        <div><dt>{t("superAdmin.reportBirthDate")}</dt><dd>{selectedReport.birthDetails.localDate ?? "—"}</dd></div>
        <div><dt>{t("superAdmin.reportBirthTime")}</dt><dd>{selectedReport.birthDetails.localTime ?? "—"}</dd></div>
        <div><dt>{t("superAdmin.reportLagna")}</dt><dd>{selectedReport.overview.lagna ?? "—"}</dd></div>
        <div><dt>{t("superAdmin.reportRashi")}</dt><dd>{selectedReport.overview.rashi ?? "—"}</dd></div>
        <div><dt>{t("superAdmin.reportNakshatra")}</dt><dd>{selectedReport.overview.nakshatra ?? "—"}{selectedReport.overview.pada ? ` · ${t("kundliDetails.pada")} ${selectedReport.overview.pada}` : ""}</dd></div>
      </dl>
      <h3>{t("superAdmin.reportPlanetaryPositions")}</h3>
      <div className="super-admin-table-wrap">
        <table className="super-admin-report-table">
          <thead><tr><th>{t("results.body")}</th><th>{t("results.sign")}</th><th>{t("results.house")}</th><th>{t("results.nakshatraPada")}</th></tr></thead>
          <tbody>{selectedReport.planets.map((planet, index) => <tr key={`${planet.name ?? "planet"}-${index}`}>
            <td>{planet.name ?? "—"}</td><td>{planet.sign ?? "—"}</td><td>{planet.house ?? "—"}</td>
            <td>{planet.nakshatra ?? "—"}{planet.pada ? ` · ${t("kundliDetails.pada")} ${planet.pada}` : ""}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {selectedReport.hasKpChart && <p className="super-admin-report-kp">{t("superAdmin.reportHasKp")}</p>}
    </section>}
  </section>;
}
