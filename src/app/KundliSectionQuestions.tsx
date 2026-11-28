"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { AssistantAnswer } from "@/presentation/kundli-assistant";
import type { AssistantReportSection } from "@/presentation/assistant-section-context";
import { translate, type Language } from "@/presentation/language";

type QuestionRecord = {
  id: string;
  question: string;
  sectionLabel: string | null;
  answer: AssistantAnswer;
  createdAt: string;
  answeredAt: string;
};

function isAssistantAnswer(value: unknown): value is AssistantAnswer {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const answer = value as Record<string, unknown>;
  return typeof answer.status === "string"
    && typeof answer.title === "string"
    && typeof answer.explanation === "string"
    && Array.isArray(answer.evidence) && answer.evidence.every((item) => typeof item === "string")
    && Array.isArray(answer.limitations) && answer.limitations.every((item) => typeof item === "string");
}

function parseQuestion(value: unknown): QuestionRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.question !== "string"
    || !isAssistantAnswer(record.answer) || typeof record.createdAt !== "string"
    || typeof record.answeredAt !== "string") return null;
  return {
    id: record.id,
    question: record.question,
    sectionLabel: typeof record.sectionLabel === "string" ? record.sectionLabel : null,
    answer: record.answer,
    createdAt: record.createdAt,
    answeredAt: record.answeredAt,
  };
}

export default function KundliSectionQuestions({
  savedChartId,
  sectionKey,
  sectionLabel,
  language,
}: {
  savedChartId: string | null;
  sectionKey: AssistantReportSection;
  sectionLabel: string;
  language: Language;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [entries, setEntries] = useState<QuestionRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const t = (key: string) => translate(language, key);

  const loadHistory = useCallback(async (nextCursor?: string) => {
    if (!savedChartId) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ savedChartId, sectionKey });
      if (nextCursor) params.set("cursor", nextCursor);
      const response = await fetch(`/api/assistant/questions?${params}`, { cache: "no-store" });
      if (response.status === 428) {
        setError(translate(language, "assistant.section.termsRequired"));
        return;
      }
      if (!response.ok) throw new Error("Question history is unavailable.");
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || !Array.isArray((body as Record<string, unknown>).questions)) {
        throw new Error("Question history response was invalid.");
      }
      const result = body as { questions: unknown[]; nextCursor?: unknown };
      const parsed = result.questions.map(parseQuestion).filter((entry): entry is QuestionRecord => entry !== null);
      setEntries((current) => nextCursor ? [...parsed, ...current] : parsed);
      setCursor(typeof result.nextCursor === "string" ? result.nextCursor : null);
    } catch {
      setError(translate(language, "assistant.section.historyError"));
    } finally {
      setLoading(false);
    }
  }, [language, savedChartId, sectionKey]);

  useEffect(() => {
    if (open) void loadHistory();
  }, [open, loadHistory]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!savedChartId || !trimmedQuestion || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/assistant/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          savedChartId,
          requestId: window.crypto.randomUUID(),
          question: trimmedQuestion,
          sectionKey,
          sectionLabel,
          language,
        }),
      });
      const body: unknown = await response.json();
      if (response.status === 428) {
        setError(t("assistant.section.termsRequired"));
        return;
      }
      if (!response.ok) throw new Error("Question could not be saved.");
      const record = body && typeof body === "object"
        ? parseQuestion((body as Record<string, unknown>).question)
        : null;
      if (!record) throw new Error("Question response was invalid.");
      setEntries((current) => [record, ...current.filter((item) => item.id !== record.id)]);
      setQuestion("");
    } catch {
      setError(t("assistant.section.submitError"));
    } finally {
      setBusy(false);
    }
  }

  return <section className="kundli-section-questions" aria-label={`${sectionLabel} ${t("assistant.historyTitle")}`}>
    <button
      type="button"
      className="kundli-section-question-toggle"
      aria-expanded={open}
      onClick={() => setOpen((current) => !current)}
    >
      {open ? t("assistant.section.close") : `${t("assistant.section.ask")} · ${sectionLabel}`}
    </button>
    {open && <div className="kundli-section-question-panel">
      {!savedChartId
        ? <p role="status">{t("assistant.section.saveFirst")}</p>
        : <>
          <form onSubmit={(event) => void submit(event)}>
            <label>
              <span>{t("assistant.section.questionLabel")}</span>
              <textarea maxLength={500} required value={question} onChange={(event) => setQuestion(event.target.value)} />
            </label>
            <button type="submit" disabled={busy || !question.trim()}>{busy ? t("assistant.section.sending") : t("assistant.section.submit")}</button>
          </form>
          {loading && <p role="status">{t("assistant.loading")}</p>}
          {error && <p className="dashboard-alert" role="alert">{error}</p>}
          {!loading && entries.length === 0 && !error && <p>{t("assistant.section.empty")}</p>}
          <div className="kundli-section-question-history" aria-live="polite">
            {[...entries].reverse().map((entry) => <article key={entry.id}>
              <h4>{entry.question}</h4>
              <p>{entry.answer.explanation}</p>
              {entry.answer.evidence.length > 0 && <details>
                <summary>{t("assistant.section.chartDetails")}</summary>
                <ul>{entry.answer.evidence.map((fact, index) => <li key={`${entry.id}-${index}`}>{fact}</li>)}</ul>
              </details>}
              <small>{new Date(entry.createdAt).toLocaleString(language === "hi" ? "hi-IN" : language === "hinglish" ? "en-IN" : "en")}</small>
            </article>)}
          </div>
          {cursor && <button type="button" className="kundli-section-question-older" disabled={loading} onClick={() => void loadHistory(cursor)}>{t("assistant.loadMore")}</button>}
        </>}
    </div>}
  </section>;
}
