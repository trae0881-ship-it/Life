"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import KundliAssistant, { type KundliAssistantAccountData } from "./KundliAssistant";
import KundliDetails from "./KundliDetails";
import { analysisReadiness } from "@/calculation/analysis-readiness";
import { hasChartCalculationInputs, validateBirthForm } from "@/presentation/birth-form";
import { readLanguagePreference, writeLanguagePreference } from "@/presentation/language-preference";
import { translate, type Language } from "@/presentation/language";
import type { AuthUser } from "@/server/auth-core";
import "./dashboard.css";
import "./kundli.css";
import "./responsive.css";

type Profile = {
  id: string;
  label: string;
  birthPlace: string | null;
  localDate: string;
  localTime: string | null;
  timeZone: string | null;
  latitude: number | null;
  longitude: number | null;
  birthTimeAccuracy: string | null;
  updatedAt?: string;
};
type SavedReport = {
  id: string;
  profileId: string | null;
  title: string;
  profileLabel: string | null;
  birthDate: string | null;
  calculationStatus: "saved-snapshot" | "profile-changed";
  availableSections: string[];
  calculationConvention: string[];
  createdAt: string;
};
type Question = {
  id: string;
  profileLabel: string | null;
  question: string;
  answerStatus: string;
  createdAt: string;
};
type Section = "home" | "profile" | "kundlis" | "ask" | "reports" | "settings";
type ProfileForm = {
  label: string;
  birthPlace: string;
  localDate: string;
  localTime: string;
  birthTimeAccuracy: string;
  timeZone: string;
  latitude: string;
  longitude: string;
};

const sections: Section[] = ["home", "profile", "kundlis", "ask", "reports", "settings"];
const sectionIcon: Record<Section, string> = { home: "⌂", profile: "◉", kundlis: "◇", ask: "✧", reports: "▤", settings: "⚙" };
const blankForm: ProfileForm = { label: "", birthPlace: "", localDate: "", localTime: "", birthTimeAccuracy: "", timeZone: "", latitude: "", longitude: "" };

function profileForm(profile: Profile): ProfileForm {
  return {
    label: profile.label,
    birthPlace: profile.birthPlace ?? "",
    localDate: profile.localDate,
    localTime: profile.localTime ?? "",
    birthTimeAccuracy: profile.birthTimeAccuracy ?? "",
    timeZone: profile.timeZone ?? "",
    latitude: profile.latitude === null ? "" : String(profile.latitude),
    longitude: profile.longitude === null ? "" : String(profile.longitude),
  };
}

export default function Dashboard({ user }: { user: AuthUser }) {
  const [language, setLanguage] = useState<Language>("en");
  const [section, setSection] = useState<Section>("home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(true);
  const recordsRequest = useRef<AbortController | null>(null);
  const currentLanguage = useRef(language);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [recordsError, setRecordsError] = useState("");
  const [profileStatus, setProfileStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reportStatus, setReportStatus] = useState<"loading" | "ready" | "error">("loading");
  const [questionStatus, setQuestionStatus] = useState<"loading" | "ready" | "empty" | "terms" | "error">("loading");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [form, setForm] = useState<ProfileForm>(blankForm);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState("");
  const [openedReport, setOpenedReport] = useState<{ title: string; result: Record<string, unknown> } | null>(null);
  const reportOpener = useRef<HTMLButtonElement | null>(null);
  const reportCloseButton = useRef<HTMLButtonElement>(null);
  const [openingReportId, setOpeningReportId] = useState("");
  const [openError, setOpenError] = useState("");
  const t = (key: string) => translate(language, key);
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null;
  const selectedProfileReport = reports.find((report) => report.profileId === selectedProfileId) ?? null;
  const formIsDirty = isCreatingProfile
    ? Object.keys(form).some((key) => form[key as keyof ProfileForm] !== blankForm[key as keyof ProfileForm])
    : Boolean(selectedProfile && JSON.stringify(form) !== JSON.stringify(profileForm(selectedProfile)));

  useEffect(() => {
    setLanguage(readLanguagePreference(window.localStorage));
  }, []);
  currentLanguage.current = language;

  const loadRecords = useCallback(async (includeQuestions = true, showLoading = true) => {
    recordsRequest.current?.abort();
    const controller = new AbortController();
    recordsRequest.current = controller;
    if (showLoading) setLoading(true);
    setRecordsError("");
    if (showLoading) {
      setProfileStatus("loading");
      setReportStatus("loading");
    }
    try {
      const [profileResponse, reportResponse] = await Promise.all([
        fetch("/api/profiles", { cache: "no-store", signal: controller.signal }).catch(() => null),
        fetch("/api/saved-charts", { cache: "no-store", signal: controller.signal }).catch(() => null),
      ]);
      if (controller.signal.aborted) return;
      if (profileResponse?.status === 401 || reportResponse?.status === 401) {
        window.location.assign("/?panel=account");
        return;
      }
      const [profileJson, reportJson] = await Promise.all([
        profileResponse?.ok ? profileResponse.json().catch(() => null) : Promise.resolve(null),
        reportResponse?.ok ? reportResponse.json().catch(() => null) : Promise.resolve(null),
      ]);
      const profileDataReady = Boolean(profileResponse?.ok && Array.isArray(profileJson?.profiles));
      const reportDataReady = Boolean(reportResponse?.ok && Array.isArray(reportJson?.charts));
      setProfiles(profileDataReady ? profileJson.profiles : []);
      setReports(reportDataReady ? reportJson.charts : []);
      setProfileStatus(profileDataReady ? "ready" : "error");
      setReportStatus(reportDataReady ? "ready" : "error");
      if (!profileDataReady || !reportDataReady) setRecordsError(translate(currentLanguage.current, "dashboard.dataUnavailable"));
      setSelectedProfileId((current) => {
        const next = profileDataReady ? profileJson.profiles as Profile[] : [];
        return next.some((profile) => profile.id === current) ? current : next[0]?.id ?? "";
      });
      if (!includeQuestions) return;
      setQuestionStatus("loading");
      try {
        const historyResponse = await fetch("/api/assistant/questions", { cache: "no-store", signal: controller.signal });
        if (controller.signal.aborted) return;
        if (historyResponse.status === 428) {
          setQuestionStatus("terms");
        } else if (!historyResponse.ok) {
          setQuestionStatus("error");
        } else {
          const historyJson = await historyResponse.json();
          const items = Array.isArray(historyJson?.questions) ? historyJson.questions as Question[] : [];
          setQuestions(items);
          setQuestionStatus(items.length ? "ready" : "empty");
        }
      } catch {
        if (!controller.signal.aborted) setQuestionStatus("error");
      }
    } catch {
      if (controller.signal.aborted) return;
      setRecordsError(translate(currentLanguage.current, "dashboard.dataUnavailable"));
    } finally {
      if (!controller.signal.aborted && showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecords();
    return () => recordsRequest.current?.abort();
  }, [loadRecords]);

  useEffect(() => {
    if (isCreatingProfile) return;
    if (selectedProfile) setForm(profileForm(selectedProfile));
    else setForm(blankForm);
    setFormError("");
    setSavedNotice("");
  }, [isCreatingProfile, selectedProfileId, selectedProfile?.updatedAt]);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        menuToggle.current?.focus({ preventScroll: true });
        return;
      }
      if (event.key === "Tab") {
        const sidebar = document.querySelector<HTMLElement>(".dashboard-sidebar.is-open");
        const focusable = sidebar?.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), select:not([disabled])");
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.querySelector<HTMLElement>(".dashboard-sidebar.is-open .dashboard-nav button")?.focus({ preventScroll: true });
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  useEffect(() => {
    if (!formIsDirty) return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [formIsDirty]);

  useEffect(() => {
    if (!openedReport) {
      reportOpener.current?.focus({ preventScroll: true });
      return;
    }
    reportCloseButton.current?.focus({ preventScroll: true });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedReport(null);
      if (event.key === "Tab") {
        const modal = document.querySelector<HTMLElement>(".dashboard-report-modal");
        const focusable = modal?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]");
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [openedReport]);

  const readiness = selectedProfile
    ? analysisReadiness({
      localDate: selectedProfile.localDate,
      localTime: selectedProfile.localTime ?? undefined,
      timeZone: selectedProfile.timeZone ?? undefined,
      latitude: selectedProfile.latitude ?? undefined,
      longitude: selectedProfile.longitude ?? undefined,
      birthPlace: selectedProfile.birthPlace ?? undefined,
    }, {
      chartCalculated: reports.some((report) => report.profileId === selectedProfile.id && report.calculationStatus === "saved-snapshot"),
    })
    : "MISSING_DOB";
  const completeness = selectedProfile
    ? hasChartCalculationInputs({
      localDate: selectedProfile.localDate,
      localTime: selectedProfile.localTime ?? "",
      timeZone: selectedProfile.timeZone ?? "",
      latitude: selectedProfile.latitude === null ? "" : String(selectedProfile.latitude),
      longitude: selectedProfile.longitude === null ? "" : String(selectedProfile.longitude),
      timeKnown: Boolean(selectedProfile.localTime),
    })
    : false;
  const assistantAccountData = useMemo<KundliAssistantAccountData>(() => ({
    profiles: profiles.map(({ id, label }) => ({ id, label })),
    charts: reports.filter((report) => {
      if (!report.profileId || report.calculationStatus !== "saved-snapshot") return false;
      const profile = profiles.find((item) => item.id === report.profileId);
      return Boolean(profile && hasChartCalculationInputs({
        localDate: profile.localDate,
        localTime: profile.localTime ?? "",
        timeZone: profile.timeZone ?? "",
        latitude: profile.latitude === null ? "" : String(profile.latitude),
        longitude: profile.longitude === null ? "" : String(profile.longitude),
        timeKnown: Boolean(profile.localTime),
      }));
    }).map(({ id, profileId, title, createdAt }) => ({ id, profileId, title, createdAt })),
    termsRequired: questionStatus === "terms",
    available: profileStatus === "ready" && reportStatus === "ready",
  }), [profiles, questionStatus, reportStatus, reports, profileStatus]);
  function confirmDiscardEdits() {
    return !formIsDirty || window.confirm(t("dashboard.discardProfileChanges"));
  }

  function changeSection(next: Section) {
    if (saving) return;
    if (next !== "profile" && !confirmDiscardEdits()) return;
    setSection(next);
    if (mobileOpen) menuToggle.current?.focus({ preventScroll: true });
    setMobileOpen(false);
    setOpenError("");
  }

  function changeProfile(nextProfileId: string) {
    if (saving) return;
    if (nextProfileId === selectedProfileId) return;
    if (!confirmDiscardEdits()) return;
    setIsCreatingProfile(false);
    setSelectedProfileId(nextProfileId);
  }

  function startNewProfile() {
    if (saving) return;
    if (!confirmDiscardEdits()) return;
    setIsCreatingProfile(true);
    setForm(blankForm);
    setFormError("");
    setSavedNotice("");
  }

  function closeMobileMenu() {
    setMobileOpen(false);
    menuToggle.current?.focus({ preventScroll: true });
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!isCreatingProfile && !selectedProfile) return;
    const validation = validateBirthForm({ ...form, timeKnown: Boolean(form.localTime) });
    if (!validation.valid) {
      setFormError(t(validation.messageKey));
      return;
    }
    setSaving(true);
    setFormError("");
    setSavedNotice("");
    try {
      const response = await fetch(isCreatingProfile
        ? "/api/profiles"
        : `/api/profiles/${encodeURIComponent(selectedProfile!.id)}`, {
        method: isCreatingProfile ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: form.label,
          birthPlace: form.birthPlace || null,
          localDate: form.localDate,
          localTime: form.localTime || null,
          birthTimeAccuracy: form.birthTimeAccuracy || null,
          timeZone: form.timeZone || null,
          latitude: form.latitude === "" ? null : Number(form.latitude),
          longitude: form.longitude === "" ? null : Number(form.longitude),
        }),
      });
      const body = await response.json();
      if (response.status === 401) {
        window.location.assign("/?panel=account");
        return;
      }
      if (!response.ok) {
        const messageKey = body.code === "NOT_FOUND"
          ? "dashboard.profileMissing"
          : ["INVALID_BIRTH_PROFILE", "INVALID_PROFILE"].includes(body.code)
            ? "dashboard.profileValidationFailed"
            : "dashboard.profileSaveFailed";
        setFormError(t(messageKey));
        return;
      }
      const savedProfile = body.profile as Profile;
      setProfiles((current) => isCreatingProfile
        ? [savedProfile, ...current]
        : current.map((profile) => profile.id === selectedProfile!.id ? savedProfile : profile));
      setIsCreatingProfile(false);
      setSelectedProfileId(savedProfile.id);
      setForm(profileForm(body.profile as Profile));
      setSavedNotice(t(isCreatingProfile ? "dashboard.profileCreated" : "dashboard.profileSaved"));
      await loadRecords(false, false);
    } catch {
      setFormError(t("dashboard.profileSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function openReport(report: SavedReport, opener?: HTMLButtonElement) {
    if (openingReportId) return;
    reportOpener.current = opener ?? null;
    setOpeningReportId(report.id);
    setOpenError("");
    try {
      const response = await fetch(`/api/saved-charts/${encodeURIComponent(report.id)}`, { cache: "no-store" });
      if (response.status === 401) {
        window.location.assign("/?panel=account");
        return;
      }
      const body = await response.json();
      if (!response.ok || !body.chart?.result || typeof body.chart.result !== "object") {
        setOpenError(t("dashboard.reportOpenFailed"));
        return;
      }
      setOpenedReport({ title: report.title, result: body.chart.result as Record<string, unknown> });
    } catch {
      setOpenError(t("dashboard.reportOpenFailed"));
    } finally {
      setOpeningReportId("");
    }
  }

  async function logout() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("logout unavailable");
      window.location.assign("/");
    } catch {
      setRecordsError(t("dashboard.logoutFailed"));
    }
  }

  function selectLanguage(value: string) {
    if (value !== "en" && value !== "hi" && value !== "hinglish") return;
    setLanguage(value);
    writeLanguagePreference(window.localStorage, value);
  }

  function setField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError("");
    setSavedNotice("");
  }

  const headingKey = `dashboard.section.${section}`;

  return <main className="user-dashboard">
    <button className="dashboard-backdrop" type="button" aria-label={t("dashboard.closeMenu")} hidden={!mobileOpen} onClick={closeMobileMenu} />
    <aside className={`dashboard-sidebar${mobileOpen ? " is-open" : ""}`} aria-label={t("dashboard.navigation")}>
      <a className="dashboard-brand" href="/"><span className="dashboard-brand-mark">✳</span><span>LIFE<small>{t("app.workbench")}</small></span></a>
      <div className="dashboard-user-chip"><span className="dashboard-avatar">{user.email.slice(0, 1).toUpperCase()}</span><span><b>{user.email.split("@")[0]}</b><small>{user.email}</small></span></div>
      <nav id="dashboard-nav" className="dashboard-nav" aria-label={t("dashboard.navigation")}>
        {sections.map((item) => <button key={item} type="button" className={section === item ? "active" : ""} aria-current={section === item ? "page" : undefined} onClick={() => changeSection(item)}>
          <span aria-hidden="true">{sectionIcon[item]}</span>{t(`dashboard.section.${item}`)}
        </button>)}
      </nav>
      <div className="dashboard-sidebar-foot">
        <a href="/terms-and-conditions">{t("legal.termsLink")}</a>
        <a href="/privacy-policy">{t("legal.privacyLink")}</a>
        <button type="button" onClick={() => void logout()}>{t("account.signOut")}</button>
      </div>
    </aside>
    <section className="dashboard-main">
      <header className="dashboard-topbar">
        <button ref={menuToggle} type="button" className="dashboard-menu-button" aria-expanded={mobileOpen} aria-controls="dashboard-nav" onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? "×" : "☰"} <span>{t("dashboard.menu")}</span></button>
        <div className="dashboard-breadcrumb">LIFE <span>/</span> {t(headingKey)}</div>
        <label className="dashboard-language"><span>{t("language.label")}</span><select aria-label={t("language.label")} value={language} onChange={(event) => selectLanguage(event.target.value)}><option value="en">English</option><option value="hi">हिन्दी</option><option value="hinglish">Hinglish</option></select></label>
      </header>
      <div className="dashboard-content">
        <header className="dashboard-page-heading">
          <div><span className="dashboard-eyebrow">{t("dashboard.eyebrow")}</span><h1>{t(headingKey)}</h1><p>{t(`dashboard.intro.${section}`)}</p></div>
          {section === "home" && <><a className="dashboard-open-studio" href="/studio">Open Chart Studio</a><span className="dashboard-welcome-mark" aria-hidden="true">✳</span></>}
        </header>
        {loading && <p className="dashboard-state" role="status">{t("dashboard.loading")}</p>}
        {!loading && recordsError && <p className="dashboard-alert" role="alert">{recordsError} <button type="button" onClick={() => void loadRecords()}>{t("dashboard.retry")}</button></p>}
        {!loading && section === "home" && <div className="dashboard-home">
          <article className="dashboard-welcome-card">
            <div><span className="dashboard-card-kicker">{t("dashboard.personalSpace")}</span><h2>{t("dashboard.welcome")}</h2><p>{user.email}{selectedProfile ? ` · ${selectedProfile.label} · ${selectedProfile.localDate}` : ` · ${t("dashboard.noSelectedProfile")}`}</p></div>
            <span className="dashboard-welcome-symbol" aria-hidden="true">☾</span>
          </article>
          <div className="dashboard-stat-grid">
            <button type="button" className="dashboard-stat-card" onClick={() => changeSection("profile")}><span>{t("dashboard.stat.profile")}</span><strong>{profileStatus === "error" ? "—" : profiles.length}</strong><small>{profileStatus === "error" ? t("dashboard.unavailable") : t("dashboard.profileCount")}</small></button>
            <button type="button" className="dashboard-stat-card" onClick={() => changeSection("kundlis")}><span>{t("dashboard.stat.kundlis")}</span><strong>{reportStatus === "error" ? "—" : reports.length}</strong><small>{reportStatus === "error" ? t("dashboard.unavailable") : t("dashboard.savedCount")}</small></button>
            <button type="button" className="dashboard-stat-card" onClick={() => changeSection("reports")}><span>{t("dashboard.stat.reports")}</span><strong>{reportStatus === "error" ? "—" : reports.length}</strong><small>{reportStatus === "error" ? t("dashboard.unavailable") : t("dashboard.savedCount")}</small></button>
            <button type="button" className="dashboard-stat-card" onClick={() => changeSection("ask")}><span>{t("dashboard.stat.questions")}</span><strong>{questionStatus === "ready" ? questions.length : questionStatus === "empty" ? 0 : "—"}</strong><small>{questionStatus === "error" ? t("dashboard.unavailable") : questionStatus === "terms" ? t("dashboard.termsNeeded") : t("dashboard.recentQuestions")}</small></button>
          </div>
          <div className="dashboard-two-column">
            <section className="dashboard-panel">
              <div className="dashboard-panel-heading"><div><span className="dashboard-card-kicker">{t("dashboard.profileOverview")}</span><h2>{t("account.profiles")}</h2></div><button type="button" onClick={() => changeSection("profile")}>{t("dashboard.manage")}</button></div>
              {profileStatus === "loading" ? <p role="status">{t("dashboard.loading")}</p> : profileStatus === "error" ? <p className="dashboard-muted">{t("dashboard.dataUnavailable")}</p> : selectedProfile ? <div className="dashboard-profile-preview">
                <label>{t("dashboard.selectProfile")}<select value={selectedProfileId} onChange={(event) => changeProfile(event.target.value)}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>
                <p><b>{selectedProfile.label}</b><span>{selectedProfile.birthPlace || t("dashboard.locationMissing")}</span></p>
                <span className={`dashboard-readiness ${completeness ? "is-ready" : ""}`}>{t(`readiness.state.${readiness}`)}</span>
                <small>{t(`readiness.${readiness}`)}</small>
              </div> : <div className="dashboard-empty"><p>{t("dashboard.noProfiles")}</p><button type="button" onClick={() => changeSection("profile")}>{t("dashboard.addProfileAction")}</button></div>}
            </section>
            <section className="dashboard-panel">
              <div className="dashboard-panel-heading"><div><span className="dashboard-card-kicker">{t("dashboard.latest")}</span><h2>{t("dashboard.recentReports")}</h2></div><button type="button" onClick={() => changeSection("reports")}>{t("dashboard.viewAll")}</button></div>
              {reportStatus === "loading" ? <p role="status">{t("dashboard.loading")}</p> : reportStatus === "error" ? <p className="dashboard-muted">{t("dashboard.dataUnavailable")}</p> : reports.length ? reports.slice(0, 3).map((report) => <article className="dashboard-recent-item dashboard-recent-report" key={report.id}>
                <div><b>{report.title}</b><small>{report.profileLabel ?? t("dashboard.unlinkedProfile")} · {report.birthDate ?? t("results.unknown")}</small></div>
                <button type="button" disabled={Boolean(openingReportId)} onClick={(event) => void openReport(report, event.currentTarget)}>{openingReportId === report.id ? t("dashboard.opening") : t("dashboard.openReport")}</button>
              </article>) : <div className="dashboard-empty"><p>{t("dashboard.noReports")}</p><a href="/studio">{t("dashboard.calculateFirst")}</a></div>}
              <div className="dashboard-recent-questions">
                <div className="dashboard-panel-heading"><h3>{t("assistant.historyTitle")}</h3><button type="button" onClick={() => changeSection("ask")}>{t("dashboard.viewAll")}</button></div>
                {questionStatus === "loading" ? <p role="status">{t("dashboard.loading")}</p> : questionStatus === "error" ? <div className="dashboard-empty"><p className="dashboard-muted">{t("dashboard.historyUnavailable")}</p><button type="button" onClick={() => void loadRecords()}>{t("dashboard.retry")}</button></div> : questionStatus === "terms" ? <p className="dashboard-muted">{t("dashboard.termsNeeded")}</p> : questions.length ? questions.slice(0, 3).map((question) => <article className="dashboard-recent-item" key={question.id}><b>{question.question}</b><small>{question.profileLabel ?? t("assistant.profileUnavailable")} · {new Date(question.createdAt).toLocaleDateString(language === "hi" ? "hi-IN" : language === "hinglish" ? "en-IN" : "en")}</small></article>) : <div className="dashboard-empty"><p>{t("dashboard.noQuestions")}</p><button type="button" onClick={() => changeSection("ask")}>{t("dashboard.askAction")}</button></div>}
              </div>
              {openError && <p className="dashboard-alert" role="alert">{openError}</p>}
            </section>
          </div>
        </div>}
        {!loading && section === "profile" && <section className="dashboard-panel dashboard-profile-section">
          <div className="dashboard-panel-heading"><div><span className="dashboard-card-kicker">{t("dashboard.profileOverview")}</span><h2>{t("dashboard.profileEditTitle")}</h2></div></div>
          {profileStatus === "error" ? <p role="alert">{t("dashboard.dataUnavailable")}</p> : profileStatus === "loading" ? <p role="status">{t("dashboard.loading")}</p> : profiles.length === 0 && !isCreatingProfile ? <div className="dashboard-empty"><p>{t("dashboard.noProfiles")}</p><button type="button" onClick={startNewProfile}>{t("dashboard.createProfile")}</button><a href="/studio">{t("dashboard.createProfileInStudio")}</a></div> : <>
            {profiles.length > 0 && !isCreatingProfile && <label className="dashboard-field">{t("dashboard.selectProfile")}<select value={selectedProfileId} onChange={(event) => changeProfile(event.target.value)}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>}
            {profiles.length > 0 && !isCreatingProfile && <button className="dashboard-add-profile" type="button" onClick={startNewProfile}>{t("dashboard.createProfile")}</button>}
            {isCreatingProfile && <p className="dashboard-profile-create-note">{t("dashboard.dobOnlyProfileNote")}</p>}
            <form className="dashboard-profile-form" onSubmit={(event) => void saveProfile(event)}>
              <label>{t("account.profileLabel")}<input required disabled={saving} maxLength={100} value={form.label} onChange={(event) => setField("label", event.target.value)} /></label>
              <label>{t("form.birthPlace")} <small>{t("form.optional")}</small><input disabled={saving} maxLength={160} value={form.birthPlace} onChange={(event) => setField("birthPlace", event.target.value)} /></label>
              <label>{t("form.date")} <small>{t("form.required")}</small><input type="date" required disabled={saving} min="1800-01-01" max="2399-12-31" value={form.localDate} onChange={(event) => setField("localDate", event.target.value)} /></label>
              <label>{t("form.time")} <small>{t("form.optional")}</small><input type="time" disabled={saving} step="60" value={form.localTime} onChange={(event) => setField("localTime", event.target.value)} /></label>
              <label>{t("form.accuracy")} <small>{t("form.optional")}</small><select disabled={saving} value={form.birthTimeAccuracy} onChange={(event) => setField("birthTimeAccuracy", event.target.value)}><option value="">{t("form.accuracy.unspecified")}</option><option value="exact">{t("form.accuracy.exact")}</option><option value="within-5-minutes">{t("form.accuracy.5")}</option><option value="within-15-minutes">{t("form.accuracy.15")}</option><option value="within-1-hour">{t("form.accuracy.hour")}</option><option value="approximate">{t("form.accuracy.approximate")}</option></select></label>
              <label>{t("form.timeZone")} <small>{t("form.optional")}</small><input disabled={saving} value={form.timeZone} onChange={(event) => setField("timeZone", event.target.value)} /></label>
              <label>{t("form.latitude")} <small>{t("form.optional")}</small><input type="number" disabled={saving} min="-90" max="90" step="any" value={form.latitude} onChange={(event) => setField("latitude", event.target.value)} /></label>
              <label>{t("form.longitude")} <small>{t("form.optional")}</small><input type="number" disabled={saving} min="-180" max="180" step="any" value={form.longitude} onChange={(event) => setField("longitude", event.target.value)} /></label>
              {!isCreatingProfile && selectedProfile && <div className="dashboard-profile-readiness"><b>{t(`readiness.state.${readiness}`)}</b><p>{t(`readiness.${readiness}`)}</p>{selectedProfile.localDate ? <a href={`/life-timeline?date=${encodeURIComponent(selectedProfile.localDate)}`}>{t("readiness.timelineLink")}</a> : null}</div>}
              {!isCreatingProfile && selectedProfileReport && <button className="dashboard-profile-report" type="button" disabled={Boolean(openingReportId)} onClick={(event) => void openReport(selectedProfileReport, event.currentTarget)}>{openingReportId === selectedProfileReport.id ? t("dashboard.opening") : t("dashboard.openProfileKundli")}</button>}
              <p className="dashboard-help">{t("form.timeHelp")} {t("form.coordinatesHelp")}</p>
              {formError && <p className="dashboard-alert" role="alert">{formError}</p>}
              {savedNotice && <p className="dashboard-success" role="status">{savedNotice}</p>}
              <button className="dashboard-primary" type="submit" disabled={saving}>{saving ? t("dashboard.saving") : t(isCreatingProfile ? "dashboard.createProfile" : "dashboard.saveProfile")}</button>
              {isCreatingProfile && <button className="dashboard-cancel-profile" type="button" disabled={saving} onClick={() => { if (confirmDiscardEdits()) { setIsCreatingProfile(false); setForm(selectedProfile ? profileForm(selectedProfile) : blankForm); } }}>{t("dashboard.cancelCreateProfile")}</button>}
            </form>
          </>}
        </section>}
        {!loading && (section === "kundlis" || section === "reports") && <section className="dashboard-panel">
          <div className="dashboard-panel-heading"><div><span className="dashboard-card-kicker">{t("dashboard.savedSnapshot")}</span><h2>{t(section === "kundlis" ? "dashboard.myKundlis" : "dashboard.myReports")}</h2></div><a href="/studio">{t("dashboard.calculateNew")}</a></div>
          {reportStatus === "error" ? <p className="dashboard-muted" role="alert">{t("dashboard.dataUnavailable")}</p> : reports.length === 0 ? <div className="dashboard-empty"><p>{t("dashboard.noReports")}</p><a href="/studio">{t("dashboard.calculateFirst")}</a></div> : <div className="dashboard-report-list">
            {reports.map((report) => <article className="dashboard-report-card" key={report.id}>
              <div className="dashboard-report-mark" aria-hidden="true">✳</div>
              <div className="dashboard-report-info"><h3>{report.title}</h3><p>{report.profileLabel ?? t("dashboard.unlinkedProfile")} · {report.birthDate ?? t("results.unknown")}</p><small>{new Date(report.createdAt).toLocaleDateString(language === "hi" ? "hi-IN" : "en")} · {t(report.calculationStatus === "profile-changed" ? "account.reportProfileChanged" : "account.reportSavedSnapshot")}</small></div>
              <button type="button" disabled={Boolean(openingReportId)} onClick={(event) => void openReport(report, event.currentTarget)}>{openingReportId === report.id ? t("dashboard.opening") : t("dashboard.openReport")}</button>
            </article>)}
          </div>}
          {openError && <p className="dashboard-alert" role="alert">{openError}</p>}
        </section>}
        {!loading && section === "ask" && <div className="dashboard-assistant-wrap">
          {profiles.length > 0 && <label className="dashboard-field">{t("dashboard.selectProfile")}<select value={selectedProfileId} onChange={(event) => setSelectedProfileId(event.target.value)}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>}
          <KundliAssistant chart={null} language={language} profileId={selectedProfileId || undefined} accountData={assistantAccountData} onTermsAccepted={() => void loadRecords(true, false)} />
        </div>}
        {!loading && section === "settings" && <section className="dashboard-panel">
          <div className="dashboard-panel-heading"><div><span className="dashboard-card-kicker">{t("dashboard.preferences")}</span><h2>{t("dashboard.accountSettings")}</h2></div></div>
          <div className="dashboard-settings-grid">
            <div><span>{t("dashboard.accountInformation")}</span><b>{user.email}</b><small>{t(`dashboard.role.${user.role}`)}</small></div>
            <label><span>{t("language.label")}</span><select aria-label={t("language.label")} value={language} onChange={(event) => selectLanguage(event.target.value)}><option value="en">English</option><option value="hi">हिन्दी</option><option value="hinglish">Hinglish</option></select></label>
            <div><span>{t("dashboard.session")}</span><button type="button" onClick={() => void logout()}>{t("account.signOut")}</button></div>
          </div>
          <div className="dashboard-legal-links"><h3>{t("dashboard.legalTitle")}</h3><a href="/terms-and-conditions">{t("legal.termsLink")}</a><a href="/privacy-policy">{t("legal.privacyLink")}</a><a href="/disclaimer">{t("legal.disclaimerLink")}</a><a href="/refund-policy">{t("legal.refundLink")}</a></div>
          <p className="dashboard-help">{t("dashboard.privacyNote")}</p>
        </section>}
      </div>
    </section>
    {openedReport && <div className="dashboard-modal-backdrop" role="presentation" onClick={() => setOpenedReport(null)}>
      <section className="dashboard-report-modal" role="dialog" aria-modal="true" aria-labelledby="opened-report-title" onClick={(event) => event.stopPropagation()}>
        <button ref={reportCloseButton} className="dashboard-modal-close" type="button" aria-label={t("dashboard.closeReport")} onClick={() => setOpenedReport(null)}>×</button>
        <span className="dashboard-card-kicker">{t("dashboard.savedSnapshot")}</span><h2 id="opened-report-title">{openedReport.title}</h2>
        {(() => {
          const ascendant = openedReport.result.ascendant as Record<string, unknown> | undefined;
          const input = openedReport.result.input as Record<string, unknown> | undefined;
          const planets = Array.isArray(openedReport.result.planets) ? openedReport.result.planets as Record<string, unknown>[] : [];
          return <><p>{String(input?.localDate ?? "")} {String(input?.localTime ?? "")}</p><p>{t("dashboard.ascendant")}: {String(ascendant?.sign ?? t("results.unknown"))}</p><KundliDetails result={openedReport.result} language={language} /><div className="dashboard-modal-planets">{planets.map((planet) => <span key={String(planet.name)}><b>{String(planet.name)}</b>{String(planet.sign)}</span>)}</div></>;
        })()}
      </section>
    </div>}
  </main>;
}
