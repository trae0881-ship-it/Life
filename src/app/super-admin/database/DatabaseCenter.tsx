"use client";

import { useCallback, useEffect, useState } from "react";
import { readLanguagePreference } from "@/presentation/language-preference";
import { translate, type Language } from "@/presentation/language";
import DatabaseTransferControls from "./DatabaseTransferControls";

type DatabaseColumn = { name: string; type: string; nullable: boolean };
type DatabaseIndex = { name: string; definition: string; unique: boolean; valid: boolean };
type DatabaseConstraint = { name: string; type: string; definition: string; validated: boolean };
type DatabasePolicy = { name: string; command: string; permissive: boolean; using: string | null; check: string | null };
type DatabaseTable = {
  name: string;
  estimatedRows: number | null;
  sensitive: boolean;
  rowLevelSecurity: boolean;
  indexes: DatabaseIndex[];
  constraints: DatabaseConstraint[];
  policies: DatabasePolicy[];
  columns: DatabaseColumn[];
};
type StorageMetrics = {
  status: "available" | "unavailable";
  measuredAt: string | null;
  source: string;
  databaseBytes: number | null;
  tables: Array<{ table: string; tableBytes: number | null; indexBytes: number | null; totalBytes: number | null }>;
  quota: { bytes: number | null; source: string | null };
  remainingBytes: number | null;
  usedPercent: number | null;
  objectStorage: { bytes: number | null; status: string };
  backupStorage: { bytes: number | null; status: string };
  warningThresholds: number[];
  warnings: number[] | null;
  warningStatus: string;
};
type DatabaseStatus = {
  state: string;
  engine: string;
  database: string | null;
  schema: string | null;
  serverVersion: string | null;
  migrations: { applied: number; expected: number; pending: string[]; incomplete: string[] };
  application: { users: number | null; superAdmins: number | null };
  storage: StorageMetrics;
  tables: DatabaseTable[];
  readiness: {
    checkedAt: string;
    completed: number;
    total: number;
    overall: string;
    items: Array<{
      id: number;
      title: string;
      status: string;
      evidence: string;
      testResult: string;
      lastCheckedAt: string;
      lastVerifiedAt: string | null;
      action: string | null;
    }>;
  };
};

const stateKeys: Record<string, string> = {
  "connection-unavailable": "databaseCenter.state.connectionUnavailable",
  "schema-missing": "databaseCenter.state.schemaMissing",
  "migrations-incomplete": "databaseCenter.state.migrationsIncomplete",
  "recovery-required": "databaseCenter.state.recoveryRequired",
  initialized: "databaseCenter.state.initialized",
  "initialized-no-super-admin": "databaseCenter.state.noSuperAdmin",
  "empty-database": "databaseCenter.state.emptyDatabase",
  "first-time-setup-required": "databaseCenter.state.firstTimeSetup",
};

function formatUtcTimestamp(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

export default function DatabaseCenter() {
  const [language, setLanguage] = useState<Language>("en");
  const [data, setData] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const t = (key: string) => translate(language, key);
  const readinessSummary = data?.readiness
    ? t("databaseCenter.readinessSummary")
      .replace("{completed}", String(data.readiness.completed))
      .replace("{total}", String(data.readiness.total))
      .replace("{overall}", data.readiness.overall)
    : "";
  const storageMeasuredAt = data?.storage.measuredAt && Number.isFinite(Date.parse(data.storage.measuredAt))
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(new Date(data.storage.measuredAt))
    : null;
  const readinessCheckedAt = formatUtcTimestamp(data?.readiness.checkedAt ?? null);

  useEffect(() => setLanguage(readLanguagePreference(window.localStorage)), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/super-admin/database", { cache: "no-store" });
      if (!response.ok) throw new Error("Database inventory request failed.");
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || Array.isArray(body)
        || !("tables" in body) || !Array.isArray(body.tables)
        || !("migrations" in body) || !("application" in body)
        || !("storage" in body) || !("readiness" in body)
        || !("state" in body) || typeof body.state !== "string") {
        throw new Error("Database inventory response was invalid.");
      }
      setData(body as DatabaseStatus);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <section aria-label={t("databaseCenter.title")} className="super-admin-database">
      <p className="super-admin-description">{t("databaseCenter.description")}</p>
      {loading ? <p aria-live="polite" className="super-admin-state">{t("databaseCenter.loading")}</p> : null}
      {error ? (
        <div className="super-admin-error" role="alert">
          <p>{t("databaseCenter.error")}</p>
          <button onClick={() => void load()} type="button">{t("superAdmin.retry")}</button>
        </div>
      ) : null}
      {!loading && !error && data ? (
        <>
          <h2 className="super-admin-database-heading">{t("databaseCenter.storageTitle")}</h2>
          <p className="super-admin-audit-note">
            {data.storage.status === "available"
              ? `${t("databaseCenter.measured")}: ${storageMeasuredAt ?? t("databaseCenter.unknown")} UTC · ${t("databaseCenter.measurementSource")}: ${data.storage.source}`
              : t("databaseCenter.storageUnavailable")}
          </p>
          <div className="super-admin-health-grid">
            <article className="super-admin-card">
              <h2>{t("databaseCenter.databaseSize")}</h2>
              <p>{data.storage.databaseBytes === null ? t("databaseCenter.unknown") : `${(data.storage.databaseBytes / (1024 ** 3)).toFixed(3)} GiB`}</p>
            </article>
            <article className="super-admin-card">
              <h2>{t("databaseCenter.quota")}</h2>
              <p>{data.storage.quota.bytes === null ? t("databaseCenter.unknown") : `${(data.storage.quota.bytes / (1024 ** 3)).toFixed(2)} GiB`}</p>
            </article>
            <article className="super-admin-card">
              <h2>{t("databaseCenter.usagePercent")}</h2>
              <p>{data.storage.usedPercent === null ? t("databaseCenter.unknown") : `${data.storage.usedPercent.toFixed(1)}%`}</p>
            </article>
            <article className="super-admin-card">
              <h2>{t("databaseCenter.objectStorage")}</h2>
              <p>{data.storage.objectStorage.bytes === null ? t("databaseCenter.unknown") : `${(data.storage.objectStorage.bytes / (1024 ** 3)).toFixed(3)} GiB`}</p>
            </article>
            <article className="super-admin-card">
              <h2>{t("databaseCenter.backupStorage")}</h2>
              <p>{data.storage.backupStorage.bytes === null ? t("databaseCenter.unknown") : `${(data.storage.backupStorage.bytes / (1024 ** 3)).toFixed(3)} GiB`}</p>
            </article>
            <article className="super-admin-card">
              <h2>{t("databaseCenter.warningThresholds")}</h2>
              <p>{data.storage.warningStatus === "not-evaluated"
                ? `${data.storage.warningThresholds.join(" / ")}% · ${t("databaseCenter.notEvaluated")}`
                : data.storage.warningStatus === "warning"
                  ? `${t("databaseCenter.warningActive")}: ${data.storage.warnings?.join(" / ")}%`
                  : `${data.storage.warningThresholds.join(" / ")}% · ${t("databaseCenter.warningBelow")}`}</p>
            </article>
          </div>
          <p className="super-admin-audit-note">{t("databaseCenter.quotaNote")}</p>
          {data.storage.tables.length > 0 ? (
            <div className="super-admin-table-wrap super-admin-storage-table">
              <table className="super-admin-user-table">
                <thead><tr>
                  <th>{t("databaseCenter.table")}</th>
                  <th>{t("databaseCenter.tableSize")}</th>
                  <th>{t("databaseCenter.indexSize")}</th>
                  <th>{t("databaseCenter.totalSize")}</th>
                </tr></thead>
                <tbody>{data.storage.tables.map((table) => (
                  <tr key={table.table}>
                    <td>{table.table}</td>
                    <td>{table.tableBytes === null ? t("databaseCenter.unknown") : `${(table.tableBytes / (1024 ** 2)).toFixed(2)} MiB`}</td>
                    <td>{table.indexBytes === null ? t("databaseCenter.unknown") : `${(table.indexBytes / (1024 ** 2)).toFixed(2)} MiB`}</td>
                    <td>{table.totalBytes === null ? t("databaseCenter.unknown") : `${(table.totalBytes / (1024 ** 2)).toFixed(2)} MiB`}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : null}
          <div className="super-admin-health-grid">
            <article className="super-admin-card">
              <h2>{t("databaseCenter.status")}</h2>
              <p>{t(stateKeys[data.state] ?? "databaseCenter.state.unknown")}</p>
            </article>
            <article className="super-admin-card">
              <h2>{t("databaseCenter.engine")}</h2>
              <p>{data.engine}{data.serverVersion ? ` ${data.serverVersion}` : ""}</p>
            </article>
            <article className="super-admin-card">
              <h2>{t("databaseCenter.database")}</h2>
              <p>{data.database ?? "—"}</p>
            </article>
            <article className="super-admin-card">
              <h2>{t("databaseCenter.schema")}</h2>
              <p>{data.schema ?? "—"}</p>
            </article>
            <article className="super-admin-card">
              <h2>{t("databaseCenter.migrations")}</h2>
              <p>{data.migrations.applied} / {data.migrations.expected}</p>
            </article>
          </div>
          {data.state !== "initialized" ? (
            <div className="super-admin-error" role="alert">
              <p>{t("databaseCenter.noOperations")}</p>
            </div>
          ) : null}
          <h2 className="super-admin-database-heading">{t("databaseCenter.inventory")}</h2>
          <p className="super-admin-audit-note">{t("databaseCenter.estimateNote")}</p>
          {data.tables.length ? (
            <div className="super-admin-table-wrap">
              <table className="super-admin-user-table">
                <thead><tr>
                  <th>{t("databaseCenter.table")}</th>
                  <th>{t("databaseCenter.columns")}</th>
                  <th>{t("databaseCenter.estimatedRows")}</th>
                  <th>{t("databaseCenter.dataClass")}</th>
                  <th>{t("databaseCenter.rowLevelSecurity")}</th>
                  <th>{t("databaseCenter.schemaObjects")}</th>
                </tr></thead>
                <tbody>{data.tables.map((table) => (
                  <tr key={table.name}>
                    <td>{table.name}</td>
                    <td>
                      <details>
                        <summary>{table.columns.length}</summary>
                        <ul className="super-admin-database-columns">
                          {table.columns.map((column) => (
                            <li key={column.name}>{column.name} · {column.type}{column.nullable ? " · NULL" : ""}</li>
                          ))}
                        </ul>
                      </details>
                    </td>
                    <td>{table.estimatedRows?.toLocaleString(language === "hi" ? "hi-IN" : "en") ?? "—"}</td>
                    <td>{table.sensitive ? t("databaseCenter.sensitive") : t("databaseCenter.applicationData")}</td>
                    <td>{table.rowLevelSecurity ? `${t("databaseCenter.enabled")} (${table.policies.length} ${t("databaseCenter.policies")})` : t("databaseCenter.disabled")}</td>
                    <td>
                      <details>
                        <summary>{table.indexes.length} {t("databaseCenter.indexes")} · {table.constraints.length} {t("databaseCenter.constraints")}</summary>
                        <ul className="super-admin-database-columns">
                          {table.indexes.map((index) => <li key={index.name}>{index.name} · {index.valid ? "valid" : "invalid"} · {index.definition}</li>)}
                          {table.constraints.map((constraint) => <li key={constraint.name}>{constraint.name} · {constraint.type} · {constraint.validated ? "validated" : "not validated"} · {constraint.definition}</li>)}
                          {table.policies.map((policy) => <li key={policy.name}>{policy.name} · {policy.command} · {policy.permissive ? "permissive" : "restrictive"} · USING {policy.using ?? "—"} · CHECK {policy.check ?? "—"}</li>)}
                        </ul>
                      </details>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : null}
          {data.migrations.pending.length ? (
            <div className="super-admin-database-migrations">
              <h2>{t("databaseCenter.pendingMigrations")}</h2>
              <ul>{data.migrations.pending.map((name) => <li key={name}>{name}</li>)}</ul>
            </div>
          ) : null}
          <h2 className="super-admin-database-heading">{t("databaseCenter.exportImportTitle")}</h2>
          <DatabaseTransferControls
            initialized={data.state === "initialized"}
            language={language}
            tables={data.tables.map(({ name, sensitive, estimatedRows }) => ({ name, sensitive, estimatedRows }))}
          />
          <section aria-labelledby="launch-readiness-title" className="super-admin-readiness">
            <div className="super-admin-readiness-heading">
              <div>
                <h2 id="launch-readiness-title">{t("databaseCenter.readinessTitle")}</h2>
                <p>{readinessSummary}</p>
              </div>
              <time dateTime={readinessCheckedAt ?? undefined}>
                {readinessCheckedAt
                  ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(readinessCheckedAt))
                  : t("databaseCenter.unknown")}
              </time>
            </div>
            <div className="super-admin-table-wrap">
              <table className="super-admin-user-table super-admin-readiness-table">
                <thead><tr>
                  <th>#</th>
                  <th>{t("databaseCenter.checklistItem")}</th>
                  <th>{t("databaseCenter.checklistStatus")}</th>
                  <th>{t("databaseCenter.checklistEvidence")}</th>
                  <th>{t("databaseCenter.checklistTestResult")}</th>
                  <th>{t("databaseCenter.lastChecked")}</th>
                  <th>{t("databaseCenter.lastVerified")}</th>
                  <th>{t("databaseCenter.outstandingAction")}</th>
                </tr></thead>
                <tbody>{data.readiness.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.title}</td>
                    <td>{item.status}</td>
                    <td>{item.evidence}</td>
                    <td>{item.testResult}</td>
                    <td>{formatUtcTimestamp(item.lastCheckedAt) ?? t("databaseCenter.unknown")}</td>
                    <td>{formatUtcTimestamp(item.lastVerifiedAt) ?? t("databaseCenter.notVerified")}</td>
                    <td>{item.action ?? "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <p className="super-admin-audit-note">{t("databaseCenter.readinessEvidenceNote")}</p>
          </section>
        </>
      ) : null}
      <button className="super-admin-health-retry" disabled={loading} onClick={() => void load()} type="button">
        {t("databaseCenter.refresh")}
      </button>
    </section>
  );
}
