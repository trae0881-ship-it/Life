"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { translate, type Language } from "@/presentation/language";
import { isRestorableSavedChartResult } from "@/presentation/saved-chart-validation";
import { CURRENT_TERMS_VERSION } from "@/legal/terms";

type User = { id: string; email: string; role: "USER" | "DEVELOPER" | "ADMIN" | "SUPER_ADMIN" };
type Profile = { id: string; label: string; birthPlace: string | null; localDate: string; localTime: string | null; timeZone: string | null; latitude: number | null; longitude: number | null; birthTimeAccuracy: string | null };
type ProfileDraft = { localDate?: string; localTime?: string; timeZone?: string; latitude?: string; longitude?: string; birthPlace?: string; birthTimeAccuracy?: string };
type SavedChart = {
  id: string;
  profileId: string | null;
  title: string;
  reportType: "VEDIC" | "KP" | "COMBINED";
  availableChartCount: number;
  profileLabel: string | null;
  birthDate: string | null;
  calculationStatus: "saved-snapshot" | "profile-changed";
  availableSections: string[];
  calculationConvention: string[];
  createdAt: string;
};
type SavedChartFilters = { query: string; reportType: "ALL" | SavedChart["reportType"] };
type ChartForSave = {
  savedChartId?: string;
  input: { fullName: string | null; birthPlace: string | null; localDate: string; localTime: string; timeZone: string; latitude: number; longitude: number; coordinateSource: string; birthTimeAccuracy: string; resolvedOffset: string };
  settings: { ayanamsa: string; houseSystem: string; node: string };
};

export default function AccountPanel({ chart, profileDraft, onLoadProfile, onLoadSavedChart, language, returnTo, initialMode = "login", lockAuthMode = false, authPortal = "standard", showRememberMe = false }: { chart: ChartForSave | null; profileDraft: ProfileDraft; onLoadProfile: (profile: Profile) => void; onLoadSavedChart: (chart: unknown) => void; language: Language; returnTo?: string; initialMode?: "login" | "register"; lockAuthMode?: boolean; authPortal?: "standard" | "developer"; showRememberMe?: boolean }) {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [charts, setCharts] = useState<SavedChart[]>([]);
  const [chartPage, setChartPage] = useState(1);
  const [chartPageCount, setChartPageCount] = useState(0);
  const [chartTotal, setChartTotal] = useState(0);
  const [reportSearch, setReportSearch] = useState("");
  const [reportTypeFilter, setReportTypeFilter] = useState<SavedChartFilters["reportType"]>("ALL");
  const [appliedReportFilters, setAppliedReportFilters] = useState<SavedChartFilters>({ query: "", reportType: "ALL" });
  const [editingChartId, setEditingChartId] = useState("");
  const [editingChartTitle, setEditingChartTitle] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [termsRequired, setTermsRequired] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState("");
  const t = (key: string) => translate(language, key);

  useEffect(() => {
    const openAccount = () => setMobileOpen(true);
    window.addEventListener("life-open-account", openAccount);
    return () => window.removeEventListener("life-open-account", openAccount);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  const loadSavedCharts = useCallback(async (page: number, filters: SavedChartFilters) => {
    const params = new URLSearchParams({ page: String(page) });
    if (filters.query) params.set("q", filters.query);
    if (filters.reportType !== "ALL") params.set("reportType", filters.reportType);
    try {
      const response = await fetch(`/api/saved-charts?${params}`, { cache: "no-store" });
      if (response.status === 401) {
        setUser(null);
        setCharts([]);
        setMessage("account.sessionExpired");
        return;
      }
      if (response.status === 503) {
        setMessage("account.persistenceUnavailable");
        return;
      }
      if (!response.ok) throw new Error("Saved report history request failed.");
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Saved report history response was invalid.");
      const result = body as Record<string, unknown>;
      if (!Array.isArray(result.charts) || !Number.isSafeInteger(result.page)
        || !Number.isSafeInteger(result.pageCount) || !Number.isSafeInteger(result.total)) {
        throw new Error("Saved report history response was invalid.");
      }
      setCharts(result.charts as SavedChart[]);
      setChartPage(result.page as number);
      setChartPageCount(result.pageCount as number);
      setChartTotal(result.total as number);
    } catch {
      setMessage("account.refreshError");
    }
  }, []);

  const refreshRecords = useCallback(async () => {
    const [profileResponse, acceptanceResponse] = await Promise.all([
      fetch("/api/profiles", { cache: "no-store" }),
      fetch("/api/legal/acceptance", { cache: "no-store" }),
    ]);
    if (profileResponse.status === 401) {
      setUser(null);
      setProfiles([]);
      setCharts([]);
      setMessage("account.sessionExpired");
      return;
    }
    if (profileResponse.status === 503 || acceptanceResponse.status === 503) {
      setMessage("account.persistenceUnavailable");
      return;
    }
    if (!profileResponse.ok || !acceptanceResponse.ok) {
      setMessage("account.refreshError");
      return;
    }
    const [profileResult, acceptanceResult] = await Promise.all([
      profileResponse.json(),
      acceptanceResponse.json(),
    ]);
    setProfiles(profileResult.profiles);
    setTermsRequired(acceptanceResult.requiresAcceptance);
    await loadSavedCharts(chartPage, appliedReportFilters);
  }, [appliedReportFilters, chartPage, loadSavedCharts]);

  useEffect(() => {
    const refresh = () => {
      if (user) void refreshRecords();
    };
    window.addEventListener("life-account-changed", refresh);
    return () => window.removeEventListener("life-account-changed", refresh);
  }, [refreshRecords, user]);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 503) throw new Error(t("account.persistenceUnavailable"));
        if (!response.ok) throw new Error(t("account.statusError"));
        const result = await response.json();
        setUser(result.user);
        if (result.user) await refreshRecords();
      })
      .catch(() => setMessage("account.serviceUnavailable"));
  }, [refreshRecords]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const password = String(form.get("password") ?? "");
    if (mode === "register" && password !== String(form.get("confirmPassword") ?? "")) {
      setMessage("account.passwordMismatch");
      event.currentTarget.querySelector<HTMLInputElement>('input[name="confirmPassword"]')?.focus();
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: mode === "register" ? String(form.get("fullName") ?? "") : undefined,
          email: String(form.get("email") ?? ""),
          password,
          confirmPassword: mode === "register" ? String(form.get("confirmPassword") ?? "") : undefined,
          acceptedTerms: form.get("acceptedTerms") === "on",
          termsVersion: mode === "register" ? CURRENT_TERMS_VERSION : undefined,
          rememberMe: mode === "login" && showRememberMe ? form.getAll("rememberMe").includes("true") : undefined,
          portal: mode === "login" && authPortal === "developer" ? "developer" : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.code === "DEVELOPER_REQUIRED") {
          setMessage("account.developerAccessRequired");
          return;
        }
        if (result.code === "EMAIL_ALREADY_REGISTERED") {
          setMessage("account.emailAlreadyRegistered");
          return;
        }
        if (authPortal === "developer" && mode === "login" && result.user?.role !== "DEVELOPER") {
          setMessage("account.developerAccessRequired");
          return;
        }
        if (result.code === "INVALID_INPUT" && mode === "register") {
          setMessage("account.registrationInvalid");
          return;
        }
        if (result.code === "FULL_NAME_INVALID") {
          setMessage("account.fullNameRequired");
          return;
        }
        if (result.code === "PASSWORD_CONFIRMATION_MISMATCH") {
          setMessage("account.passwordMismatch");
          return;
        }
        if (result.code === "RATE_LIMITED") {
          setMessage("account.rateLimited");
          return;
        }
        throw new Error(t("account.signInError"));
      }
      if (returnTo) {
        try {
          const sessionResponse = await fetch("/api/auth/me", { cache: "no-store" });
          const sessionResult = sessionResponse.ok ? await sessionResponse.json() as { user?: User | null } : null;
          if (!sessionResult?.user || sessionResult.user.id !== result.user.id) {
            setUser(null);
            setMessage(mode === "register" ? "account.registrationSessionUnverified" : "account.signInError");
            return;
          }
        } catch {
          setMessage(mode === "register" ? "account.registrationSessionUnverified" : "account.signInError");
          return;
        }
        setUser(result.user);
        formElement.reset();
        window.dispatchEvent(new Event("life-account-changed"));
        const role = result.user.role;
        const destination = authPortal === "developer"
          ? role === "DEVELOPER" ? "/developers/dashboard" : "/developers"
          : role === "SUPER_ADMIN" ? "/super-admin"
            : role === "ADMIN" ? "/admin"
              : "/dashboard";
        window.location.assign(destination);
        return;
      }
      setUser(result.user);
      formElement.reset();
      await refreshRecords();
      window.dispatchEvent(new Event("life-account-changed"));
    } catch {
      setMessage(mode === "register" ? "account.registrationError" : "account.signInError");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error(t("account.signOutError"));
      setUser(null);
      setProfiles([]);
      setCharts([]);
      setTermsRequired(false);
      window.dispatchEvent(new Event("life-account-changed"));
      window.location.replace("/");
    } catch {
      setMessage("account.signOutError");
    } finally {
      setBusy(false);
    }
  }

  function applyReportFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const filters = { query: reportSearch.trim(), reportType: reportTypeFilter };
    setAppliedReportFilters(filters);
    setChartPage(1);
    void loadSavedCharts(1, filters);
  }

  async function saveProfile() {
    const source = chart ? {
      localDate: chart.input.localDate,
      birthPlace: chart.input.birthPlace,
      localTime: chart.input.localTime,
      timeZone: chart.input.timeZone,
      latitude: chart.input.latitude,
      longitude: chart.input.longitude,
      birthTimeAccuracy: chart.input.birthTimeAccuracy === "unspecified" ? null : chart.input.birthTimeAccuracy,
    } : profileDraft;
    if (!source.localDate || !label.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          birthPlace: source.birthPlace || null,
          localDate: source.localDate,
          localTime: source.localTime || null,
          timeZone: source.timeZone || null,
          latitude: source.latitude === "" || source.latitude === undefined ? null : Number(source.latitude),
          longitude: source.longitude === "" || source.longitude === undefined ? null : Number(source.longitude),
          birthTimeAccuracy: source.birthTimeAccuracy || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(t("account.profileSaveError"));
      setProfiles((old) => [result.profile, ...old]);
      setSelectedProfileId(result.profile.id);
      setLabel("");
      setMessage("account.profileSaved");
    } catch {
      setMessage("account.profileSaveError");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProfile(profileId: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/profiles/${encodeURIComponent(profileId)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(t("account.profileDeleteError"));
      setProfiles((old) => old.filter((profile) => profile.id !== profileId));
      if (selectedProfileId === profileId) setSelectedProfileId("");
      setMessage("account.profileDeleted");
    } catch {
      setMessage("account.profileDeleteError");
    } finally {
      setBusy(false);
    }
  }

  async function saveChart() {
    if (!chart || !title.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/saved-charts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          profileId: selectedProfileId || null,
          input: { ...chart.input, fullName: chart.input.fullName ?? undefined, birthPlace: chart.input.birthPlace ?? undefined, ayanamsa: chart.settings.ayanamsa, houseSystem: chart.settings.houseSystem, nodeMode: chart.settings.node },
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.code === "PROFILE_CHART_MISMATCH") {
          setMessage("account.profileChartMismatch");
          return;
        }
        throw new Error(t("account.chartSaveError"));
      }
      setTitle("");
      setMessage("account.chartSaved");
      setChartPage(1);
      await loadSavedCharts(1, appliedReportFilters);
    } catch {
      setMessage("account.chartSaveError");
    } finally {
      setBusy(false);
    }
  }

  async function deleteChart(chartId: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/saved-charts/${encodeURIComponent(chartId)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(t("account.chartDeleteError"));
      const nextTotal = Math.max(0, chartTotal - 1);
      const nextPageCount = Math.ceil(nextTotal / 10);
      const nextPage = nextPageCount === 0 ? 1 : Math.min(chartPage, nextPageCount);
      if (chartPage !== nextPage) await loadSavedCharts(nextPage, appliedReportFilters);
      else {
        setCharts((old) => old.filter((item) => item.id !== chartId));
        setChartTotal(nextTotal);
        setChartPageCount(nextPageCount);
      }
      if (editingChartId === chartId) setEditingChartId("");
      setMessage("account.chartDeleted");
    } catch {
      setMessage("account.chartDeleteError");
    } finally {
      setBusy(false);
    }
  }

  async function renameChart(chartId: string) {
    const nextTitle = editingChartTitle.trim();
    if (!nextTitle || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/saved-charts/${encodeURIComponent(chartId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });
      if (!response.ok) throw new Error(t("account.chartRenameError"));
      setCharts((old) => old.map((item) => item.id === chartId ? { ...item, title: nextTitle } : item));
      setEditingChartId("");
      setEditingChartTitle("");
      setMessage("account.chartRenamed");
    } catch {
      setMessage("account.chartRenameError");
    } finally {
      setBusy(false);
    }
  }

  async function loadSavedChart(chartId: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/saved-charts/${encodeURIComponent(chartId)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result?.chart || !isRestorableSavedChartResult(result.chart.result)) {
        throw new Error(t("account.chartLoadError"));
      }
      setSelectedProfileId(result.chart.profileId ?? "");
      onLoadSavedChart({ ...result.chart.result, savedChartId: result.chart.id });
      setMessage("account.chartLoaded");
    } catch {
      setMessage("account.chartLoadError");
    } finally {
      setBusy(false);
    }
  }

  async function acceptCurrentTerms() {
    if (!termsChecked) return;
    setBusy(true);
    try {
      const response = await fetch("/api/legal/acceptance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true, version: CURRENT_TERMS_VERSION }),
      });
      if (!response.ok) throw new Error("terms acceptance failed");
      setTermsRequired(false);
      setTermsChecked(false);
      setMessage("account.termsAccepted");
      window.dispatchEvent(new Event("life-account-changed"));
    } catch {
      setMessage("account.termsAcceptError");
    } finally {
      setBusy(false);
    }
  }

  return <section id="account" className={`account-panel${mobileOpen ? " account-panel-mobile-open" : ""}`} aria-label={t("account.title")}>
    <button type="button" className="account-mobile-toggle" aria-expanded={mobileOpen} aria-controls="account-content" onClick={() => setMobileOpen((open) => !open)}>{t("account.mobileToggle")}</button>
    <div className="account-content" id="account-content">
    <div className="account-heading">{t("account.title")}</div>
    {user ? <>
      <div className="account-identity"><b>{user.email}</b><small>{user.role}</small></div>
      <button type="button" className="account-action" disabled={busy} onClick={() => void logout()}>{t("account.signOut")}</button>
      {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && <a className="account-action" href="/admin">{t("account.admin")}</a>}
      {termsRequired && <div className="account-terms-notice">
        <p>{t("account.termsRequired")} <a href="/terms-and-conditions">{t("legal.termsLink")}</a> · <a href="/privacy-policy">{t("legal.privacyLink")}</a></p>
        <label><input type="checkbox" checked={termsChecked} onChange={(event) => setTermsChecked(event.target.checked)} /> {t("account.acceptTerms")}</label>
        <button type="button" className="account-action" disabled={busy || !termsChecked} onClick={() => void acceptCurrentTerms()}>{t("account.acceptAndContinue")}</button>
      </div>}
      <div className="account-records">
        <b>{t("account.profiles")}</b>
        {profiles.map((profile) => <div className="account-record" key={profile.id}><button type="button" onClick={() => { setSelectedProfileId(profile.id); onLoadProfile(profile); }}>{profile.label}</button><button type="button" aria-label={`${t("account.delete")} ${profile.label}`} disabled={busy} onClick={() => void deleteProfile(profile.id)}>×</button></div>)}
        {(chart || profileDraft.localDate) && <div className="account-inline"><input aria-label={t("account.profileLabel")} maxLength={100} placeholder={t("account.profilePlaceholder")} value={label} onChange={(event) => setLabel(event.target.value)} /><button type="button" disabled={busy || !label.trim()} onClick={() => void saveProfile()}>{t("account.saveProfile")}</button></div>}
      </div>
      <div className="account-records">
        <b>{t("account.savedCharts")}</b>
        <form className="account-report-filters" onSubmit={applyReportFilters}>
          <input aria-label={t("account.reportSearch")} maxLength={100} placeholder={t("account.reportSearch")} value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} />
          <select aria-label={t("account.reportTypeFilter")} value={reportTypeFilter} onChange={(event) => setReportTypeFilter(event.target.value as SavedChartFilters["reportType"])}>
            <option value="ALL">{t("account.reportType.all")}</option>
            <option value="VEDIC">{t("account.reportType.VEDIC")}</option>
            <option value="KP">{t("account.reportType.KP")}</option>
            <option value="COMBINED">{t("account.reportType.COMBINED")}</option>
          </select>
          <button type="submit">{t("account.applyReportFilters")}</button>
        </form>
        {charts.map((item) => {
          const reportStatus = item.calculationStatus === "profile-changed"
            ? t("account.reportProfileChanged")
            : t("account.reportSavedSnapshot");
          return <div className="account-record account-report-record" key={item.id}>
            {editingChartId === item.id ? <form className="account-report-rename" onSubmit={(event) => { event.preventDefault(); void renameChart(item.id); }}>
              <input aria-label={t("account.chartTitle")} maxLength={120} required value={editingChartTitle} onChange={(event) => setEditingChartTitle(event.target.value)} />
              <button type="submit" disabled={busy || !editingChartTitle.trim()}>{t("account.renameSave")}</button>
              <button type="button" disabled={busy} onClick={() => setEditingChartId("")}>{t("account.renameCancel")}</button>
            </form> : <>
              <button className="account-report-open" type="button" disabled={busy} onClick={() => void loadSavedChart(item.id)}>
                {item.title}
                <small>{new Date(item.createdAt).toLocaleDateString()} · {t("account.reportProfile")}: {item.profileLabel ?? t("account.noProfileLink")}</small>
                <small>{t("account.reportBirthDate")}: {item.birthDate ?? t("results.unknown")}</small>
                <small>{t(`account.reportType.${item.reportType}`)} · {t("account.chartsAvailable")}: {item.availableChartCount}</small>
                <small>{reportStatus}</small>
                <small>{t("account.reportSections")}: {item.availableSections.map((section) => t(`account.reportSection.${section}`)).join(" · ") || t("results.unknown")}</small>
              </button>
              <div className="account-report-actions">
                <button type="button" disabled={busy} onClick={() => { setEditingChartId(item.id); setEditingChartTitle(item.title); }}>{t("account.renameReport")}</button>
                <button type="button" aria-label={`${t("account.delete")} ${item.title}`} disabled={busy} onClick={() => void deleteChart(item.id)}>×</button>
              </div>
            </>}
          </div>;
        })}
        {charts.length === 0 && <small className="account-report-empty">{t("account.noSavedReports")}</small>}
        {chartPageCount > 1 && <div className="account-report-pagination">
          <button type="button" disabled={busy || chartPage <= 1} onClick={() => void loadSavedCharts(chartPage - 1, appliedReportFilters)}>{t("account.reportPrevious")}</button>
          <span>{t("account.reportPage")} {chartPage} / {chartPageCount} · {chartTotal}</span>
          <button type="button" disabled={busy || chartPage >= chartPageCount} onClick={() => void loadSavedCharts(chartPage + 1, appliedReportFilters)}>{t("account.reportNext")}</button>
        </div>}
        {chart && !chart.savedChartId && <div className="account-inline account-save-chart">
          <label>{t("account.linkProfile")}<select aria-label={t("account.linkProfile")} value={selectedProfileId} onChange={(event) => setSelectedProfileId(event.target.value)}><option value="">{t("account.noProfileLink")}</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>
          <input aria-label={t("account.chartTitle")} maxLength={120} placeholder={t("account.chartPlaceholder")} value={title} onChange={(event) => setTitle(event.target.value)} />
          <button type="button" disabled={busy || !title.trim()} onClick={() => void saveChart()}>{t("account.saveChart")}</button>
        </div>}
        <small className="account-report-pdf-note">{t("account.pdfAvailable")}</small>
      </div>
    </> : <form className="account-auth-form" onSubmit={submitAuth}>
      {!lockAuthMode && <div className="account-mode"><button type="button" aria-pressed={mode === "login"} onClick={() => setMode("login")}>{t("account.signIn")}</button><button type="button" aria-pressed={mode === "register"} onClick={() => setMode("register")}>{t("account.register")}</button></div>}
      {mode === "register" && <label>{t("account.fullName")}<input type="text" name="fullName" minLength={1} maxLength={100} autoComplete="name" required /></label>}
      <label>{t("account.email")}<input type="email" name="email" maxLength={254} autoComplete="email" required /></label>
      <label>{t("account.password")}<input type={showPasswords ? "text" : "password"} name="password" minLength={12} maxLength={128} autoComplete={mode === "register" ? "new-password" : "current-password"} required /></label>
      {mode === "register" && <small>{t("account.passwordHelp")}</small>}
      {mode === "register" && <label>{t("account.confirmPassword")}<input type={showPasswords ? "text" : "password"} name="confirmPassword" minLength={12} maxLength={128} autoComplete="new-password" required /></label>}
      <button className="account-password-toggle" type="button" aria-pressed={showPasswords} onClick={() => setShowPasswords((visible) => !visible)}>{showPasswords ? t("account.hidePassword") : t("account.showPassword")}</button>
      {mode === "login" && showRememberMe && <label className="account-remember-check"><input type="hidden" name="rememberMe" value="false" /><input type="checkbox" name="rememberMe" value="true" defaultChecked /> Remember me</label>}
      {mode === "register" && <div className="account-terms-check">
        <label className="account-terms-label"><input type="checkbox" name="acceptedTerms" required /> <span>{t("account.signupTerms")}</span></label>
        <span className="account-terms-links"><a href="/terms-and-conditions">{t("legal.termsLink")}</a> · <a href="/privacy-policy">{t("legal.privacyLink")}</a></span>
      </div>}
      {mode === "login" && <small className="account-legal-links"><a href="/terms-and-conditions">{t("legal.termsLink")}</a> · <a href="/privacy-policy">{t("legal.privacyLink")}</a></small>}
      <button className="account-action" type="submit" disabled={busy}>{busy ? t("account.wait") : mode === "register" ? t("account.register") : t("account.signIn")}</button>
      {mode === "login" && <a className="account-recovery-link" href="/forgot-password">Forgot password?</a>}
    </form>}
    {message && <p role="status" className="account-message">{t(message)}{message === "account.registrationSessionUnverified" && <> <a href="/login">Sign in to continue</a>.</>}</p>}
    </div>
  </section>;
}
