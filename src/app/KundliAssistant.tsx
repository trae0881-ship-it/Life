"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { AssistantAnswer, AssistantChart } from "@/presentation/kundli-assistant";
import { filterAssistantQuestions, type AssistantQuestionCategory, type AssistantQuestionId } from "@/presentation/assistant-questions";
import { translate, type Language } from "@/presentation/language";
import { CURRENT_TERMS_VERSION } from "@/legal/terms";

type Profile = { id: string; label: string };
type SavedChart = { id: string; profileId: string | null; title: string; resultHash?: string; createdAt: string };
type HistoryEntry = {
  id: string;
  profileId: string | null;
  profileLabel: string | null;
  question: string;
  questionId: string | null;
  topic: string | null;
  answer: AssistantAnswer;
  answerStatus: string;
  createdAt: string;
  answeredAt: string;
};
type PendingQuestion = {
  profileId: string;
  savedChartId: string;
  requestId: string;
  question: string;
  questionId?: AssistantQuestionId;
  language: Language;
};
export type KundliAssistantAccountData = {
  profiles: Profile[];
  charts: SavedChart[];
  termsRequired: boolean;
  available: boolean;
};

const categories: (AssistantQuestionCategory | "all")[] = [
  "all", "marriage", "government", "career", "business", "money", "foreign", "other",
];
const historyTopics = ["basics", "career", "business", "relationships", "vargas", "dasha", "transits", "yogas", "kp", "panchanga", "interpretation"];

function isAssistantAnswer(value: unknown): value is AssistantAnswer {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const answer = value as Record<string, unknown>;
  return typeof answer.status === "string"
    && typeof answer.title === "string"
    && typeof answer.explanation === "string"
    && Array.isArray(answer.evidence)
    && Array.isArray(answer.limitations)
    && Array.isArray(answer.followUpIds);
}

function parseHistoryEntry(value: unknown): HistoryEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.question !== "string"
    || typeof record.answerStatus !== "string" || typeof record.createdAt !== "string"
    || typeof record.answeredAt !== "string"
    || !isAssistantAnswer(record.answer)) return null;
  if (record.profileId !== null && typeof record.profileId !== "string") return null;
  if (record.profileLabel !== null && typeof record.profileLabel !== "string") return null;
  if (record.questionId !== null && typeof record.questionId !== "string") return null;
  if (record.topic !== null && typeof record.topic !== "string") return null;
  return {
    id: record.id,
    profileId: record.profileId,
    profileLabel: record.profileLabel,
    question: record.question,
    questionId: record.questionId,
    topic: record.topic,
    answer: record.answer,
    answerStatus: record.answerStatus,
    createdAt: record.createdAt,
    answeredAt: record.answeredAt,
  };
}

export default function KundliAssistant({ chart, language, profileId, accountData, onTermsAccepted }: {
  chart: AssistantChart | null;
  language: Language;
  profileId?: string;
  accountData?: KundliAssistantAccountData;
  onTermsAccepted?: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AssistantQuestionCategory | "all">("all");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [selectedChartId, setSelectedChartId] = useState("");
  const [authStatus, setAuthStatus] = useState<"checking" | "signedOut" | "ready" | "termsRequired" | "error">("checking");
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyTopic, setHistoryTopic] = useState("");
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<PendingQuestion | null>(null);
  const [termsChecked, setTermsChecked] = useState(false);
  const t = (key: string) => translate(language, key);

  useEffect(() => {
    if (accountData) {
      setProfiles(accountData.profiles);
      setSavedCharts(accountData.charts);
      setAuthStatus(!accountData.available ? "error" : accountData.termsRequired ? "termsRequired" : "ready");
      return;
    }
    let cancelled = false;
    async function loadAccount() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) throw new Error("account status unavailable");
        const result = await response.json();
        if (cancelled) return;
        if (!result.user) {
          setAuthStatus("signedOut");
          return;
        }
        const [profileResponse, chartResponse, acceptanceResponse] = await Promise.all([
          fetch("/api/profiles", { cache: "no-store" }),
          fetch("/api/saved-charts", { cache: "no-store" }),
          fetch("/api/legal/acceptance", { cache: "no-store" }),
        ]);
        if (!profileResponse.ok || !chartResponse.ok || !acceptanceResponse.ok) throw new Error("account records unavailable");
        const [profileResult, chartResult, acceptanceResult] = await Promise.all([
          profileResponse.json(), chartResponse.json(), acceptanceResponse.json(),
        ]);
        if (cancelled) return;
        setProfiles(profileResult.profiles as Profile[]);
        setSavedCharts(chartResult.charts as SavedChart[]);
        setAuthStatus(acceptanceResult.requiresAcceptance ? "termsRequired" : "ready");
      } catch {
        if (!cancelled) setAuthStatus("error");
      }
    }
    const handleAccountChanged = () => { void loadAccount(); };
    void loadAccount();
    window.addEventListener("life-account-changed", handleAccountChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("life-account-changed", handleAccountChanged);
    };
  }, [accountData?.available, accountData?.charts, accountData?.profiles, accountData?.termsRequired]);

  useEffect(() => {
    if (profileId && profiles.some((profile) => profile.id === profileId)) {
      const match = savedCharts.find((item) => item.profileId === profileId);
      setSelectedProfileId(profileId);
      setSelectedChartId(match?.id ?? "");
      return;
    }
    if (chart?.provenance?.resultHash) {
      const matched = savedCharts.find((item) => item.resultHash === chart.provenance?.resultHash && item.profileId);
      if (matched) {
        setSelectedChartId(matched.id);
        setSelectedProfileId(matched.profileId ?? "");
        return;
      }
    }
    if (!selectedChartId) {
      const firstLinked = savedCharts.find((item) => item.profileId);
      if (firstLinked) {
        setSelectedChartId(firstLinked.id);
        setSelectedProfileId(firstLinked.profileId ?? "");
      }
    }
  }, [chart?.provenance?.resultHash, profileId, profiles, savedCharts, selectedChartId]);

  useEffect(() => {
    const selectedChart = savedCharts.find((item) => item.id === selectedChartId);
    if (selectedChart?.profileId !== selectedProfileId) setSelectedChartId("");
  }, [selectedProfileId, selectedChartId, savedCharts]);

  useEffect(() => {
    if (authStatus !== "ready") return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setHistoryBusy(true);
      try {
        const params = new URLSearchParams();
        if (historySearch.trim()) params.set("search", historySearch.trim());
        if (historyTopic) params.set("topic", historyTopic);
        if (historyFrom) params.set("from", historyFrom);
        if (historyTo) params.set("to", historyTo);
        const response = await fetch(`/api/assistant/questions?${params}`, { cache: "no-store" });
        if (response.status === 428) {
          if (!cancelled) setAuthStatus("termsRequired");
          return;
        }
        if (!response.ok) throw new Error("history unavailable");
        const result = await response.json();
        const parsed = (result.questions as unknown[]).map(parseHistoryEntry).filter((entry: HistoryEntry | null): entry is HistoryEntry => entry !== null);
        if (!cancelled) {
          setEntries(parsed);
          setHistoryCursor(typeof result.nextCursor === "string" ? result.nextCursor : null);
        }
      } catch {
        if (!cancelled) setError(t("assistant.historyError"));
      } finally {
        if (!cancelled) setHistoryBusy(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [authStatus, historyFrom, historySearch, historyTo, historyTopic]);

  const visibleQuestions = useMemo(
    () => filterAssistantQuestions(selectedCategory, search, language),
    [language, search, selectedCategory],
  );
  const availableCharts = useMemo(
    () => savedCharts.filter((item) => item.profileId === selectedProfileId),
    [savedCharts, selectedProfileId],
  );
  const visibleEntries = useMemo(
    () => entries.filter((entry) => entry.profileId === (profileId ?? selectedProfileId)),
    [entries, profileId, selectedProfileId],
  );

  function handleProfileChange(profileId: string) {
    setSelectedProfileId(profileId);
    const match = savedCharts.find((item) => item.profileId === profileId);
    setSelectedChartId(match?.id ?? "");
  }

  async function sendPending(request: PendingQuestion) {
    setBusy(true);
    setError("");
    setPending(request);
    try {
      const response = await fetch("/api/assistant/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const result = await response.json();
      if (response.status === 428) {
        setAuthStatus("termsRequired");
        return;
      }
      if (!response.ok) {
        if (result.code === "PROFILE_CHART_MISMATCH") {
          setError(t("assistant.profileChartMismatch"));
          setPending(null);
          return;
        }
        throw new Error(result.code ?? "assistant request failed");
      }
      const record = parseHistoryEntry(result.question);
      if (!record) throw new Error("assistant response was invalid");
      setEntries((existing) => [record, ...existing.filter((entry) => entry.id !== record.id)]);
      setQuestion("");
      setPending(null);
    } catch {
      setError(t("assistant.submitError"));
    } finally {
      setBusy(false);
    }
  }

  function ask(query: string, questionId?: AssistantQuestionId) {
    if (authStatus !== "ready" || !selectedProfileId || !selectedChartId || busy) return;
    if (profileId && selectedProfileId !== profileId) return;
    if (!savedCharts.some((item) => item.id === selectedChartId && item.profileId === selectedProfileId)) return;
    const next = {
      profileId: selectedProfileId,
      savedChartId: selectedChartId,
      requestId: window.crypto.randomUUID(),
      question: query,
      ...(questionId ? { questionId } : {}),
      language,
    } satisfies PendingQuestion;
    void sendPending(next);
  }

  function askPopular(id: AssistantQuestionId) {
    ask(t(`assistant.popular.${id}`), id);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (question.trim()) ask(question.trim());
  }

  async function loadMore() {
    if (!historyCursor || historyBusy) return;
    setHistoryBusy(true);
    try {
      const params = new URLSearchParams({ cursor: historyCursor });
      if (historySearch.trim()) params.set("search", historySearch.trim());
      if (historyTopic) params.set("topic", historyTopic);
      if (historyFrom) params.set("from", historyFrom);
      if (historyTo) params.set("to", historyTo);
      const response = await fetch(`/api/assistant/questions?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("history unavailable");
      const result = await response.json();
      const parsed = (result.questions as unknown[]).map(parseHistoryEntry).filter((entry: HistoryEntry | null): entry is HistoryEntry => entry !== null);
      setEntries((existing) => [...existing, ...parsed.filter((entry) => !existing.some((old) => old.id === entry.id))]);
      setHistoryCursor(typeof result.nextCursor === "string" ? result.nextCursor : null);
    } catch {
      setError(t("assistant.historyError"));
    } finally {
      setHistoryBusy(false);
    }
  }

  async function deleteEntry(id: string) {
    try {
      const response = await fetch(`/api/assistant/questions/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete failed");
      setEntries((existing) => existing.filter((entry) => entry.id !== id));
    } catch {
      setError(t("assistant.deleteError"));
    }
  }

  async function acceptTerms() {
    if (!termsChecked) return;
    try {
      const response = await fetch("/api/legal/acceptance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true, version: CURRENT_TERMS_VERSION }),
      });
      if (!response.ok) throw new Error("acceptance failed");
      setAuthStatus("ready");
      setTermsChecked(false);
      onTermsAccepted?.();
    } catch {
      setError(t("assistant.termsError"));
    }
  }

  return <section className="card kundli-assistant" id="assistant" aria-labelledby="assistant-title">
    <div className="card-head">
      <div><div className="section-index">{t("assistant.eyebrow")}</div><h2 id="assistant-title">{t("assistant.title")}</h2></div>
      <a className="assistant-history-link" href="/dashboard/questions">{t("assistant.historyLink")}</a>
    </div>
    <p className="assistant-intro">{t("assistant.intro")}</p>
    {authStatus === "checking" && <p role="status">{t("assistant.loading")}</p>}
    {authStatus === "signedOut" && <p className="assistant-empty">{t("assistant.signInRequired")} <a href="/login?next=%2Fdashboard">{t("account.signIn")}</a></p>}
    {authStatus === "error" && <p className="assistant-error" role="alert">{t("assistant.accountError")}</p>}
    {authStatus === "termsRequired" && <div className="assistant-terms" role="status">
      <p>{t("assistant.termsRequired")} <a href="/terms-and-conditions">{t("legal.termsLink")}</a> · <a href="/privacy-policy">{t("legal.privacyLink")}</a></p>
      <label><input type="checkbox" checked={termsChecked} onChange={(event) => setTermsChecked(event.target.checked)} /> {t("account.acceptTerms")}</label>
      <button type="button" disabled={!termsChecked} onClick={() => void acceptTerms()}>{t("account.acceptAndContinue")}</button>
    </div>}
    {authStatus === "ready" && <>
      <div className="assistant-selection">
        {!profileId && <label className="field-label">{t("assistant.selectProfile")}
          <select value={selectedProfileId} onChange={(event) => handleProfileChange(event.target.value)}>
            <option value="">{t("assistant.selectProfilePlaceholder")}</option>
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}
          </select>
        </label>}
        <label className="field-label">{t("assistant.selectChart")}
          <select value={selectedChartId} onChange={(event) => setSelectedChartId(event.target.value)} disabled={!selectedProfileId}>
            <option value="">{t("assistant.selectChartPlaceholder")}</option>
            {availableCharts.map((item) => <option key={item.id} value={item.id}>{item.title} · {new Date(item.createdAt).toLocaleDateString()}</option>)}
          </select>
        </label>
      </div>
      {!selectedChartId && <p className="assistant-empty">{chart
        ? t("assistant.saveChartFirst")
        : t("assistant.noSavedChart")}</p>}
      {selectedChartId && <>
        <label className="field-label assistant-search" htmlFor="assistant-search">{t("assistant.search")}
          <input id="assistant-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <div className="assistant-filters" role="group" aria-label={t("assistant.category.all")}>
          {categories.map((category) => <button
            key={category}
            type="button"
            aria-pressed={selectedCategory === category}
            className={selectedCategory === category ? "selected" : ""}
            onClick={() => setSelectedCategory(category)}
          >{t(`assistant.category.${category}`)}</button>)}
        </div>
        <div className="assistant-suggestions" aria-label={t("assistant.suggestions")}>
          {visibleQuestions.map((item) => <button key={item.id} type="button" disabled={busy} onClick={() => askPopular(item.id)}>{t(`assistant.popular.${item.id}`)}</button>)}
          {visibleQuestions.length === 0 && <p className="assistant-empty" role="status">{t("assistant.noQuestions")}</p>}
        </div>
        <form className="assistant-form" onSubmit={submit}>
          <label className="field-label" htmlFor="assistant-question">{t("assistant.askLabel")}</label>
          <div className="assistant-input-row">
            <input id="assistant-question" maxLength={500} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={t("assistant.placeholder")} />
            <button type="submit" disabled={!question.trim() || busy}>{busy ? t("assistant.loading") : t("assistant.ask")}</button>
          </div>
        </form>
      </>}
    </>}
    {error && <div className="assistant-error" role="alert">{error} {pending && <button type="button" disabled={busy} onClick={() => void sendPending(pending)}>{t("assistant.retry")}</button>}</div>}
    <div className="assistant-history" aria-live="polite">
      <div className="assistant-history-heading"><h3>{t("assistant.historyTitle")}</h3>{historyBusy && <span role="status">{t("assistant.loading")}</span>}</div>
      {authStatus === "ready" && <div className="assistant-history-filters">
        <label className="field-label">{t("assistant.historySearch")}<input type="search" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} /></label>
        <label className="field-label">{t("assistant.historyTopic")}<select value={historyTopic} onChange={(event) => setHistoryTopic(event.target.value)}><option value="">{t("assistant.allTopics")}</option>{historyTopics.map((topic) => <option key={topic} value={topic}>{t(`assistant.topic.${topic}`)}</option>)}</select></label>
        <label className="field-label">{t("assistant.fromDate")}<input type="date" value={historyFrom} onChange={(event) => setHistoryFrom(event.target.value)} /></label>
        <label className="field-label">{t("assistant.toDate")}<input type="date" value={historyTo} onChange={(event) => setHistoryTo(event.target.value)} /></label>
      </div>}
      {visibleEntries.map((entry) => <article className="assistant-entry" key={entry.id}>
        <div className="assistant-entry-meta"><span>{entry.profileLabel ?? t("assistant.profileUnavailable")}</span><span>{t(`assistant.status.${entry.answerStatus}`)}</span><span>{t("assistant.questionDate")}: <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString(language === "hi" ? "hi-IN" : language === "hinglish" ? "en-IN" : "en")}</time></span><span>{t("assistant.answerDate")}: <time dateTime={entry.answeredAt}>{new Date(entry.answeredAt).toLocaleString(language === "hi" ? "hi-IN" : language === "hinglish" ? "en-IN" : "en")}</time></span></div>
        <h3>{entry.question}</h3>
        <details className="assistant-full-answer">
          <summary>{t("assistant.readAnswer")}</summary>
          <div className="assistant-answer-block"><b>{t("assistant.interpretationLabel")}</b><p>{entry.answer.explanation}</p></div>
          {entry.answer.evidence.length > 0 && <details>
            <summary>{t("assistant.calculatedEvidence")} ({entry.answer.evidence.length})</summary>
            <ul>{entry.answer.evidence.map((fact, factIndex) => <li key={`${factIndex}-${fact}`}>{fact}</li>)}</ul>
            <small>{entry.answer.evidenceDisclosure}</small>
          </details>}
          {entry.answer.limitations.length > 0 && <details className="assistant-limitations">
            <summary>{t("assistant.limitations")}</summary>
            <ul>{entry.answer.limitations.map((limitation, limitationIndex) => <li key={`${limitationIndex}-${limitation}`}>{limitation}</li>)}</ul>
          </details>}
          <p className="assistant-disclaimer">{entry.answer.disclaimer}</p>
        </details>
        <button type="button" className="assistant-delete" onClick={() => void deleteEntry(entry.id)}>{t("assistant.deleteQuestion")}</button>
      </article>)}
      {authStatus === "ready" && !visibleEntries.length && !historyBusy && <p className="assistant-empty">{t("assistant.empty")}</p>}
      {historyCursor && <button type="button" className="assistant-load-more" disabled={historyBusy} onClick={() => void loadMore()}>{t("assistant.loadMore")}</button>}
    </div>
  </section>;
}
