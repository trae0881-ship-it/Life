"use client";

import { useEffect, useRef, useState } from "react";
import { translate, type Language } from "@/presentation/language";

type KundaliRecord = {
  id: string;
  contentType: string;
  fileExtension: string;
  fileSizeBytes: number;
  processingStatus: "MANUAL_REVIEW_REQUIRED";
  uploadedAt: string;
  downloadName: string;
};

function isKundaliRecord(value: unknown): value is KundaliRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    && typeof record.contentType === "string"
    && typeof record.fileExtension === "string"
    && typeof record.fileSizeBytes === "number"
    && record.processingStatus === "MANUAL_REVIEW_REQUIRED"
    && typeof record.uploadedAt === "string"
    && typeof record.downloadName === "string";
}

function beginBrowserDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
}

export default function KundaliVault({ language, onAsk }: { language: Language; onAsk: () => void }) {
  const [record, setRecord] = useState<KundaliRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const t = (key: string) => translate(language, key);

  useEffect(() => {
    let active = true;
    fetch("/api/kundalis", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.assign("/login?next=%2Fdashboard");
          throw new Error("signed out");
        }
        if (!response.ok) throw new Error("load failed");
        const body = await response.json() as { kundalis?: unknown };
        if (!Array.isArray(body.kundalis) || body.kundalis.length > 1) throw new Error("invalid response");
        const nextRecord = body.kundalis.length === 1 && isKundaliRecord(body.kundalis[0]) ? body.kundalis[0] : null;
        if (body.kundalis.length === 1 && !nextRecord) throw new Error("invalid response");
        if (active) setRecord(nextRecord);
      })
      .catch(() => {
        if (active) setError(t("kundali.loadFailed"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  function uploadFile(file: File | undefined) {
    if (!file || uploading) return;
    setError("");
    setNotice("");
    setProgress(0);
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/kundalis");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => {
      setError(t("kundali.uploadFailed"));
      setUploading(false);
    };
    xhr.onload = () => {
      let body: { kundali?: unknown; error?: unknown } = {};
      try {
        body = JSON.parse(xhr.responseText) as typeof body;
      } catch {
        setError(t("kundali.uploadFailed"));
        setUploading(false);
        return;
      }
      if (xhr.status === 401) {
        window.location.assign("/login?next=%2Fdashboard");
        setUploading(false);
        return;
      }
      if (xhr.status !== 201 || !isKundaliRecord(body.kundali)) {
        setError(typeof body.error === "string" ? body.error : t("kundali.uploadFailed"));
        setUploading(false);
        return;
      }
      const saved = body.kundali;
      setRecord(saved);
      setNotice(t("kundali.downloadNotice"));
      beginBrowserDownload(`/api/kundalis/${encodeURIComponent(saved.id)}/original`, saved.downloadName);
      setUploading(false);
      setProgress(100);
    };
    xhr.send(form);
  }

  async function downloadOriginal() {
    if (!record) return;
    setError("");
    try {
      const response = await fetch(`/api/kundalis/${encodeURIComponent(record.id)}/original`, { cache: "no-store" });
      if (response.status === 401) {
        window.location.assign("/login?next=%2Fdashboard");
        return;
      }
      if (!response.ok) throw new Error("download failed");
      const blob = await response.blob();
      const originalFile = new File([blob], record.downloadName, { type: record.contentType });
      if (navigator.share && navigator.canShare?.({ files: [originalFile] })) {
        try {
          await navigator.share({ files: [originalFile], title: record.downloadName });
          setNotice(t("kundali.downloadNotice"));
          return;
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === "AbortError") return;
        }
      }
      const objectUrl = URL.createObjectURL(blob);
      beginBrowserDownload(objectUrl, record.downloadName);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      setNotice(t("kundali.downloadNotice"));
    } catch {
      setError(t("kundali.downloadFailed"));
    }
  }

  async function deleteDocument() {
    if (!record || deleting || !window.confirm(t("kundali.deleteConfirm"))) return;
    setError("");
    setNotice("");
    setDeleting(true);
    try {
      const response = await fetch(`/api/kundalis/${encodeURIComponent(record.id)}`, { method: "DELETE", cache: "no-store" });
      if (response.status === 401) {
        window.location.assign("/login?next=%2Fdashboard");
        return;
      }
      if (!response.ok) throw new Error("delete failed");
      setRecord(null);
      setNotice(t("kundali.deleted"));
    } catch {
      setError(t("kundali.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    uploadFile(event.dataTransfer.files[0]);
  }

  return <section className="dashboard-panel kundali-vault" aria-labelledby="kundali-vault-title">
    <div className="dashboard-panel-heading">
      <div><span className="dashboard-card-kicker">{t("dashboard.preferences")}</span><h2 id="kundali-vault-title">{t("kundali.title")}</h2></div>
      {record && <span className="kundali-status">{t("kundali.reviewRequired")}</span>}
    </div>
    <p className="kundali-vault-description">{t("kundali.description")}</p>
    <label
      className={`kundali-dropzone${dragging ? " is-dragging" : ""}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        disabled={uploading}
        onChange={(event) => {
          uploadFile(event.currentTarget.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      <span aria-hidden="true" className="kundali-dropzone-icon">↑</span>
      <span>{t("kundali.dropPrompt")}</span>
      <span className="kundali-file-types">{t("kundali.fileTypes")}</span>
      <span className="kundali-choose-file">{t("kundali.chooseFile")}</span>
    </label>
    {uploading && <div className="kundali-progress-wrap">
      <span>{t("kundali.uploading")} · {progress}%</span>
      <progress aria-label={t("kundali.progress")} max={100} value={progress} />
    </div>}
    {loading && <p className="dashboard-state" role="status">{t("kundali.loading")}</p>}
    {record && !loading && <article className="kundali-document">
      <div className="kundali-document-meta">
        <b>{record.fileExtension.toUpperCase()} · {(record.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</b>
        <small>{new Date(record.uploadedAt).toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN")}</small>
        <span>{t("kundali.reviewRequired")}</span>
      </div>
      <div className="kundali-document-actions">
        <button type="button" onClick={() => void downloadOriginal()}>{t("kundali.download")}</button>
        <button type="button" disabled={deleting} onClick={() => void deleteDocument()}>{deleting ? t("dashboard.saving") : t("kundali.delete")}</button>
      </div>
      <p className="kundali-extraction-note">{t("kundali.noOcr")}</p>
      <p className="kundali-review-help">{t("kundali.reviewHelp")}</p>
      <div className="kundali-document-actions">
        <a href="/studio">{t("kundali.openStudio")}</a>
        <button type="button" onClick={onAsk}>{t("kundali.ask")}</button>
      </div>
      <p className="kundali-report-unavailable">{t("kundali.reportUnavailable")}</p>
      <p className="kundali-mobile-note">{t("kundali.mobileNote")}</p>
    </article>}
    {!record && !loading && <p className="kundali-empty">{t("kundali.noDocument")}</p>}
    {error && <p className="dashboard-alert" role="alert">{error}</p>}
    {notice && <p className="dashboard-success" role="status">{notice}</p>}
  </section>;
}
