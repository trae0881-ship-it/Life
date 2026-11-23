"use client";

import { useEffect, useRef, useState } from "react";
import {
  assistantQuestionCatalog,
  type AssistantQuestionId,
} from "@/presentation/assistant-questions";
import type { PalmistryAnswer } from "@/presentation/palmistry-assistant";
import {
  emptyPalmistryObservations,
  palmistryFactors,
  palmistryVisibility,
  parsePalmistryObservations,
  type PalmistryFactor,
  type PalmistryObservations,
} from "@/server/palmistry-observations";
import { translate, type Language } from "@/presentation/language";

type PalmistryRecord = {
  contentType: string;
  fileExtension: string;
  fileSizeBytes: number;
  observations: PalmistryObservations;
  uploadedAt: string;
  updatedAt: string;
  downloadName: string;
};

function isPalmistryRecord(value: unknown): value is PalmistryRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.contentType === "string"
    && typeof record.fileExtension === "string"
    && typeof record.fileSizeBytes === "number"
    && parsePalmistryObservations(record.observations) !== null
    && typeof record.uploadedAt === "string"
    && typeof record.updatedAt === "string"
    && typeof record.downloadName === "string";
}

function isPalmistryAnswer(value: unknown): value is PalmistryAnswer {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const answer = value as Record<string, unknown>;
  if (!["traditional", "insufficient", "unsupported"].includes(String(answer.status)) || !Array.isArray(answer.factors)) return false;
  return answer.factors.every((factor) => {
    if (!factor || typeof factor !== "object" || Array.isArray(factor)) return false;
    const item = factor as Record<string, unknown>;
    return palmistryFactors.includes(item.factor as PalmistryFactor)
      && (item.visibility === "clear" || item.visibility === "faint");
  });
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

export default function PalmistryDashboard({ language }: { language: Language }) {
  const [record, setRecord] = useState<PalmistryRecord | null>(null);
  const [observations, setObservations] = useState<PalmistryObservations>(emptyPalmistryObservations);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<AssistantQuestionId>("marriage_factors");
  const [answer, setAnswer] = useState<PalmistryAnswer | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const t = (key: string) => translate(language, key);

  useEffect(() => {
    let active = true;
    fetch("/api/palmistry", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.assign("/login?next=%2Fdashboard");
          throw new Error("signed out");
        }
        if (!response.ok) throw new Error("load failed");
        const body = await response.json() as { palmistry?: unknown };
        const nextRecord = body.palmistry === null ? null : isPalmistryRecord(body.palmistry) ? body.palmistry : undefined;
        if (nextRecord === undefined) throw new Error("invalid response");
        if (active) {
          setRecord(nextRecord);
          setObservations(nextRecord?.observations ?? emptyPalmistryObservations);
        }
      })
      .catch(() => {
        if (active) setError(t("palmistry.loadFailed"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!record) {
      setPreviewUrl("");
      return;
    }
    let active = true;
    let objectUrl = "";
    fetch("/api/palmistry/original", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("preview unavailable");
        const blob = await response.blob();
        if (!blob.type.startsWith("image/")) throw new Error("unexpected image type");
        objectUrl = URL.createObjectURL(blob);
        if (active) setPreviewUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => {
        if (active) setError(t("palmistry.loadFailed"));
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [record?.uploadedAt]);

  function uploadFile(file: File | undefined) {
    if (!file || uploading) return;
    setError("");
    setNotice("");
    setProgress(0);
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/palmistry");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => {
      setError(t("palmistry.uploadFailed"));
      setUploading(false);
    };
    xhr.onload = () => {
      let body: { palmistry?: unknown; error?: unknown } = {};
      try {
        body = JSON.parse(xhr.responseText) as typeof body;
      } catch {
        setError(t("palmistry.uploadFailed"));
        setUploading(false);
        return;
      }
      if (xhr.status === 401) {
        window.location.assign("/login?next=%2Fdashboard");
        setUploading(false);
        return;
      }
      if (xhr.status !== 201 || !isPalmistryRecord(body.palmistry)) {
        setError(typeof body.error === "string" ? body.error : t("palmistry.uploadFailed"));
        setUploading(false);
        return;
      }
      setRecord(body.palmistry);
      setObservations(body.palmistry.observations);
      setAnswer(null);
      setNotice(t("palmistry.uploadComplete"));
      setUploading(false);
      setProgress(100);
    };
    xhr.send(form);
  }

  async function saveObservations() {
    if (!record || saving) return;
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const response = await fetch("/api/palmistry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observations }),
      });
      if (response.status === 401) {
        window.location.assign("/login?next=%2Fdashboard");
        return;
      }
      const body = await response.json() as { palmistry?: unknown; error?: unknown };
      if (!response.ok || !isPalmistryRecord(body.palmistry)) {
        throw new Error(typeof body.error === "string" ? body.error : t("palmistry.observationsFailed"));
      }
      setRecord(body.palmistry);
      setObservations(body.palmistry.observations);
      setAnswer(null);
      setNotice(t("palmistry.observationsSaved"));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("palmistry.observationsFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function askQuestion() {
    if (!record || asking) return;
    setError("");
    setNotice("");
    setAnswer(null);
    setAsking(true);
    try {
      const response = await fetch("/api/palmistry/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: selectedQuestion, language }),
      });
      if (response.status === 401) {
        window.location.assign("/login?next=%2Fdashboard");
        return;
      }
      const body = await response.json() as { answer?: unknown; error?: unknown };
      if (!response.ok || !isPalmistryAnswer(body.answer)) {
        throw new Error(typeof body.error === "string" ? body.error : t("palmistry.questionFailed"));
      }
      setAnswer(body.answer);
    } catch (questionError) {
      setError(questionError instanceof Error ? questionError.message : t("palmistry.questionFailed"));
    } finally {
      setAsking(false);
    }
  }

  async function downloadOriginal() {
    if (!record) return;
    setError("");
    try {
      const response = await fetch("/api/palmistry/original", { cache: "no-store" });
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
          setNotice(t("palmistry.downloadNotice"));
          return;
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === "AbortError") return;
        }
      }
      const objectUrl = URL.createObjectURL(blob);
      beginBrowserDownload(objectUrl, record.downloadName);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      setNotice(t("palmistry.downloadNotice"));
    } catch {
      setError(t("palmistry.downloadFailed"));
    }
  }

  async function deletePalmistry() {
    if (!record || deleting || !window.confirm(t("palmistry.deleteConfirm"))) return;
    setError("");
    setNotice("");
    setDeleting(true);
    try {
      const response = await fetch("/api/palmistry", { method: "DELETE", cache: "no-store" });
      if (response.status === 401) {
        window.location.assign("/login?next=%2Fdashboard");
        return;
      }
      if (!response.ok) throw new Error("delete failed");
      setRecord(null);
      setObservations(emptyPalmistryObservations);
      setAnswer(null);
      setNotice(t("palmistry.deleted"));
    } catch {
      setError(t("palmistry.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    uploadFile(event.dataTransfer.files[0]);
  }

  const answerTitle = answer ? t(`palmistry.answer.${answer.status}`) : "";
  const answerDetail = answer ? t(`palmistry.answer.${answer.status}Detail`) : "";

  return <section className="dashboard-panel palmistry-panel" aria-labelledby="palmistry-title">
    <div className="dashboard-panel-heading">
      <div><span className="dashboard-card-kicker">{t("dashboard.preferences")}</span><h2 id="palmistry-title">{t("palmistry.title")}</h2></div>
      {record && <span className="kundali-status">{record.fileExtension.toUpperCase()}</span>}
    </div>
    <p className="palmistry-copy">{t("palmistry.description")}</p>
    <p className="palmistry-notice">{t("palmistry.noRecognition")}</p>
    <p className="palmistry-copy">{t("palmistry.traditionNote")}</p>
    <label
      className={`kundali-dropzone${dragging ? " is-dragging" : ""}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        const target = event.relatedTarget;
        if (!(target instanceof Node) || !event.currentTarget.contains(target)) setDragging(false);
      }}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        disabled={uploading}
        onChange={(event) => {
          uploadFile(event.currentTarget.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      <span aria-hidden="true" className="kundali-dropzone-icon">↑</span>
      <span>{t("palmistry.dropPrompt")}</span>
      <span className="kundali-file-types">{t("palmistry.fileTypes")}</span>
      <span className="kundali-choose-file">{t("palmistry.chooseFile")}</span>
    </label>
    {uploading && <div className="kundali-progress-wrap">
      <span>{t("palmistry.uploading")} · {progress}%</span>
      <progress aria-label={t("palmistry.progress")} max={100} value={progress} />
    </div>}
    {loading && <p className="dashboard-state" role="status">{t("palmistry.loading")}</p>}
    {!loading && record && <article className="palmistry-record">
      {previewUrl && <img className="palmistry-preview" src={previewUrl} alt={t("palmistry.title")} />}
      <div className="kundali-document-meta">
        <b>{record.fileExtension.toUpperCase()} · {(record.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</b>
        <small>{new Date(record.uploadedAt).toLocaleDateString(language === "hi" ? "hi-IN" : language === "hinglish" ? "en-IN" : "en")}</small>
      </div>
      <p className="palmistry-copy">{t("palmistry.observationsHelp")}</p>
      <div className="palmistry-observations">
        <h3>{t("palmistry.observationsTitle")}</h3>
        {palmistryFactors.map((factor) => <fieldset className="palmistry-factor" key={factor}>
          <legend>{t(`palmistry.factor.${factor}`)}</legend>
          <div className="palmistry-options">
            {palmistryVisibility.map((visibility) => <label key={visibility}>
              <input
                type="radio"
                name={`palmistry-${factor}`}
                value={visibility}
                checked={observations[factor] === visibility}
                disabled={saving}
                onChange={() => {
                  setObservations((current) => ({ ...current, [factor]: visibility }));
                  setAnswer(null);
                  setNotice("");
                }}
              />
              <span>{t(`palmistry.visibility.${visibility}`)}</span>
            </label>)}
          </div>
        </fieldset>)}
        <button type="button" className="dashboard-primary" disabled={saving || JSON.stringify(observations) === JSON.stringify(record.observations)} onClick={() => void saveObservations()}>
          {saving ? t("palmistry.saving") : t("palmistry.saveObservations")}
        </button>
      </div>
      <div className="palmistry-questions">
        <h3>{t("palmistry.questionsTitle")}</h3>
        <label className="dashboard-field">{t("palmistry.selectQuestion")}
          <select value={selectedQuestion} onChange={(event) => {
            setSelectedQuestion(event.target.value as AssistantQuestionId);
            setAnswer(null);
          }}>
            {assistantQuestionCatalog.map((question) => <option value={question.id} key={question.id}>
              {t(`assistant.popular.${question.id}`)}
            </option>)}
          </select>
        </label>
        <button type="button" className="dashboard-primary" disabled={asking} onClick={() => void askQuestion()}>
          {asking ? t("palmistry.asking") : t("palmistry.ask")}
        </button>
        {answer && <section className="palmistry-answer" aria-live="polite">
          <h4>{answerTitle}</h4>
          <p>{answerDetail}</p>
          {answer.factors.length > 0 && <div>
            <b>{t("palmistry.answer.evidence")}</b>
            <ul>{answer.factors.map(({ factor, visibility }) => <li key={factor}>
              {t(`palmistry.factor.${factor}`)} · {t(`palmistry.visibility.${visibility}`)} — {t(`palmistry.theme.${factor}`)}
            </li>)}</ul>
          </div>}
        </section>}
      </div>
      <div className="kundali-document-actions">
        <button type="button" onClick={() => void downloadOriginal()}>{t("palmistry.download")}</button>
        <button type="button" disabled={deleting} onClick={() => void deletePalmistry()}>{deleting ? t("dashboard.saving") : t("palmistry.delete")}</button>
      </div>
      <p className="kundali-mobile-note">{t("palmistry.mobileNote")}</p>
    </article>}
    {!record && !loading && <p className="kundali-empty">{t("palmistry.noImage")}</p>}
    {error && <p className="dashboard-alert" role="alert">{error}</p>}
    {notice && <p className="dashboard-success" role="status">{notice}</p>}
  </section>;
}
