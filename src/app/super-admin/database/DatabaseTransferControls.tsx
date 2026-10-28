"use client";

import { useMemo, useState } from "react";
import { translate, type Language } from "@/presentation/language";

type ExportTable = { name: string; sensitive: boolean; estimatedRows: number | null };
type ImportPreview = {
  compatible: boolean;
  targetDatabase: string;
  table: string | null;
  rows: number;
  columns: string[];
  issues: string[];
};

const NEVER_EXPORT_TABLES = new Set([
  "_prisma_migrations",
  "Session",
  "PasswordResetToken",
  "ManagedScript",
  "ManagedScriptAuditLog",
  "ApiKeyAuditLog",
  "ApiPlatformAuditLog",
  "SuperAdminAccessLog",
  "VerificationRun",
  "VerificationEvidence",
  "VerificationAcknowledgement",
  "VerificationStatusHistory",
]);

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const MAX_EXPORT_BYTES = 100 * 1024 * 1024;

export default function DatabaseTransferControls({
  language,
  tables,
  initialized,
}: {
  language: Language;
  tables: ExportTable[];
  initialized: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [format, setFormat] = useState<"csv" | "jsonl">("jsonl");
  const [sensitiveConfirmation, setSensitiveConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [confirmedTarget, setConfirmedTarget] = useState("");
  const [confirmNoOverwrite, setConfirmNoOverwrite] = useState(false);
  const t = (key: string) => translate(language, key);
  const eligibleTables = useMemo(
    () => tables.filter((table) => !NEVER_EXPORT_TABLES.has(table.name)),
    [tables],
  );
  const selectedSensitive = selected.some((name) => eligibleTables.find((table) => table.name === name)?.sensitive);
  const confirmationValid = Boolean(preview?.compatible
    && confirmedTarget === preview.targetDatabase
    && confirmNoOverwrite);

  function toggleTable(tableName: string) {
    setSensitiveConfirmation("");
    setSelected((current) => current.includes(tableName)
      ? current.filter((name) => name !== tableName)
      : [...current, tableName]);
  }

  async function exportSelected() {
    setBusy(true);
    setError("");
    setProgress(t("databaseCenter.transferStarting"));
    try {
      const response = await fetch("/api/super-admin/database/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tables: selected,
          format,
          includeSensitive: selectedSensitive && sensitiveConfirmation === "EXPORT SENSITIVE DATA",
          confirmSensitive: selectedSensitive ? sensitiveConfirmation : "",
        }),
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? t("databaseCenter.transferFailed"));
      }
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_EXPORT_BYTES) {
          await reader.cancel();
          throw new Error(t("databaseCenter.transferTooLarge"));
        }
        chunks.push(value);
        setProgress(`${t("databaseCenter.transferProgress")} ${(totalBytes / (1024 * 1024)).toFixed(2)} MiB`);
      }
      const contents = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        contents.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const blob = new Blob([contents], { type: response.headers.get("content-type") ?? "application/octet-stream" });
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename = disposition.match(/filename="([A-Za-z0-9._-]+)"/)?.[1] ?? `life-database-export.${format}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setProgress(`${t("databaseCenter.transferComplete")} · ${(totalBytes / (1024 * 1024)).toFixed(2)} MiB`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("databaseCenter.transferFailed"));
      setProgress("");
    } finally {
      setBusy(false);
    }
  }

  async function submitImport(action: "preview" | "commit") {
    if (!file) return;
    setBusy(true);
    setError("");
    setProgress(action === "preview" ? t("databaseCenter.importValidating") : t("databaseCenter.importRunning"));
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("action", action);
      if (action === "commit") {
        form.set("confirmTarget", confirmedTarget);
        form.set("confirmImport", confirmNoOverwrite ? "IMPORT" : "");
      }
      const response = await fetch("/api/super-admin/database/import", { method: "POST", body: form });
      const body = await response.json() as { preview?: ImportPreview; result?: { preview?: ImportPreview; committed?: boolean }; error?: string };
      if (!response.ok && response.status !== 409) throw new Error(body.error ?? t("databaseCenter.transferFailed"));
      const nextPreview = body.preview ?? body.result?.preview ?? null;
      setPreview(nextPreview);
      setConfirmedTarget("");
      setConfirmNoOverwrite(false);
      if (action === "commit" && body.result?.committed) {
        setProgress(t("databaseCenter.importComplete"));
      } else {
        setProgress(action === "preview" ? t("databaseCenter.importPreviewComplete") : "");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("databaseCenter.transferFailed"));
      setProgress("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="super-admin-transfer">
      {!initialized ? <p>{t("databaseCenter.noOperations")}</p> : (
        <>
          <section aria-labelledby="database-export-title">
            <h3 id="database-export-title">{t("databaseCenter.exportTitle")}</h3>
            <p>{t("databaseCenter.exportLimitations")}</p>
            <fieldset disabled={busy}>
              <legend>{t("databaseCenter.selectTables")}</legend>
              <div className="super-admin-transfer-table-list">
                {eligibleTables.map((table) => (
                  <label key={table.name}>
                    <input checked={selected.includes(table.name)} onChange={() => toggleTable(table.name)} type="checkbox" />
                    <span>{table.name}{table.sensitive ? ` · ${t("databaseCenter.sensitive")}` : ""}</span>
                    <small>{table.estimatedRows === null ? t("databaseCenter.unknown") : `~${table.estimatedRows.toLocaleString()}`}</small>
                  </label>
                ))}
              </div>
              <button onClick={() => {
                setSensitiveConfirmation("");
                setSelected(eligibleTables.map((table) => table.name));
              }} type="button">
                {t("databaseCenter.selectAll")}
              </button>
              <button onClick={() => {
                setSensitiveConfirmation("");
                setSelected([]);
              }} type="button">{t("databaseCenter.clearSelection")}</button>
              <label>
                {t("databaseCenter.exportFormat")}
                <select value={format} onChange={(event) => setFormat(event.target.value as "csv" | "jsonl")}>
                  <option value="jsonl">JSONL</option>
                  <option value="csv" disabled={selected.length !== 1}>CSV (one table)</option>
                </select>
              </label>
              {selectedSensitive ? (
                <label className="super-admin-transfer-warning">
                  <span>{t("databaseCenter.sensitiveExportConfirm")}</span>
                  <input
                    autoComplete="off"
                    onChange={(event) => setSensitiveConfirmation(event.target.value)}
                    placeholder="EXPORT SENSITIVE DATA"
                    value={sensitiveConfirmation}
                  />
                </label>
              ) : null}
              <button disabled={busy || selected.length === 0 || (selectedSensitive && sensitiveConfirmation !== "EXPORT SENSITIVE DATA")} onClick={() => void exportSelected()} type="button">
                {busy ? t("databaseCenter.transferWorking") : t("databaseCenter.exportDownload")}
              </button>
            </fieldset>
          </section>

          <section aria-labelledby="database-import-title">
            <h3 id="database-import-title">{t("databaseCenter.importTitle")}</h3>
            <p>{t("databaseCenter.importLimitations")}</p>
            <label>
              {t("databaseCenter.importFile")}
              <input
                accept=".jsonl,application/x-ndjson"
                disabled={busy}
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setPreview(null);
                  setConfirmedTarget("");
                  setConfirmNoOverwrite(false);
                  setError("");
                  setProgress("");
                }}
                type="file"
              />
            </label>
            <button disabled={busy || !file || file.size > MAX_IMPORT_BYTES} onClick={() => void submitImport("preview")} type="button">
              {t("databaseCenter.importPreview")}
            </button>
            {preview ? (
              <div aria-live="polite" className="super-admin-transfer-preview">
                <h4>{t("databaseCenter.importPreviewTitle")}</h4>
                <p>{t("databaseCenter.importTarget")}: <strong>{preview.targetDatabase}</strong></p>
                <p>{t("databaseCenter.importDetected")}: {preview.table ?? t("databaseCenter.unknown")} · {preview.columns.length} {t("databaseCenter.columns")} · {preview.rows} {t("databaseCenter.importRows")}</p>
                {preview.issues.length ? <ul role="alert">{preview.issues.map((issue, index) => <li key={`${index}-${issue}`}>{issue}</li>)}</ul> : <p>{t("databaseCenter.importDryRunPassed")}</p>}
                {preview.compatible ? (
                  <>
                    <label>
                      {t("databaseCenter.confirmTarget")}
                      <input autoComplete="off" onChange={(event) => setConfirmedTarget(event.target.value)} value={confirmedTarget} />
                    </label>
                    <label className="super-admin-transfer-warning">
                      <input checked={confirmNoOverwrite} onChange={(event) => setConfirmNoOverwrite(event.target.checked)} type="checkbox" />
                      {t("databaseCenter.confirmNoOverwrite")}
                    </label>
                    <button disabled={busy || !confirmationValid} onClick={() => void submitImport("commit")} type="button">
                      {t("databaseCenter.importCommit")}
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </section>
          <p aria-live="polite" className="super-admin-audit-note">{progress}</p>
          {error ? <p className="super-admin-error" role="alert">{error}</p> : null}
        </>
      )}
    </div>
  );
}
