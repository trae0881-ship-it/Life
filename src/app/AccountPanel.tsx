"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { translate, type Language } from "@/presentation/language";
import { savedReportSettingsChanged } from "@/presentation/saved-report";
import { isRestorableSavedChartResult } from "@/presentation/saved-chart-validation";
import { CURRENT_TERMS_VERSION } from "@/legal/terms";

type User = { id: string; email: string; role: "USER" | "DEVELOPER" | "ADMIN" | "SUPER_ADMIN" };
type Profile = { id: string; label: string; birthPlace: string | null; localDate: string; localTime: string | null; timeZone: string | null; latitude: number | null; longitude: number | null; birthTimeAccuracy: string | null };
type ProfileDraft = { localDate?: string; localTime?: string; timeZone?: string; latitude?: string; longitude?: string; birthPlace?: string; birthTimeAccuracy?: string };
type SavedChart = {
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
type ChartForSave = {
  input: { fullName: string | null; birthPlace: string | null; localDate: string; localTime: string; timeZone: string; latitude: number; longitude: number; coordinateSource: string; birthTimeAccuracy: string; resolvedOffset: string };
  settings: { ayanamsa: string; houseSystem: string; node: string };
};

export default function AccountPanel({ chart, profileDraft, onLoadProfile, onLoadSavedChart, language, returnTo, initialMode = "login", lockAuthMode = false, authPortal = "standard" }: { chart: ChartForSave | null; profileDraft: ProfileDraft; onLoadProfile: (profile: Profile) => void; onLoadSavedChart: (chart: unknown) => void; language: Language; returnTo?: string; initialMode?: "login" | "register"; lockAuthMode?: boolean; authPortal?: "standard" | "developer" }) {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [charts, setCharts] = useState<SavedChart[]>([]);
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

  const refreshRecords = useCallback(async () => {
    const [profileResponse, chartResponse, acceptanceResponse] = await Promise.all([
      fetch("/api/profiles", { cache: "no-store" }),
      fetch("/api/saved-charts", { cache: "no-store" }),
      fetch("/api/legal/acceptance", { cache: "no-store" }),
    ]);
    if (profileResponse.status === 401 || chartResponse.status === 401) {
      setUser(null);
      setProfiles([]);
      setCharts([]);
      setMessage("account.sessionExpired");
      return;
    }
    if (profileResponse.status === 503 || chartResponse.status === 503 || acceptanceResponse.status === 503) {
      setMessage("account.persistenceUnavailable");
      return;
    }
    if (!profileResponse.ok || !chartResponse.ok || !acceptanceResponse.ok) {
      setMessage("account.refreshError");
      return;
    }
    const [profileResult, chartResult, acceptanceResult] = await Promise.all([
      profileResponse.json(),
      chartResponse.json(),
      acceptanceResponse.json(),
    ]);
    setProfiles(profileResult.profiles);
    setCharts(chartResult.charts);
    setTermsRequired(acceptanceResult.requiresAcceptance);
  }, []);

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
        window.location.assign(returnTo);
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
      setCharts((old) => [result.chart, ...old]);
      setTitle("");
      setMessage("account.chartSaved");
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
      setCharts((old) => old.filter((item) => item.id !== chartId));
      setMessage("account.chartDeleted");
    } catch {
      setMessage("account.chartDeleteError");
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
      onLoadSavedChart(result.chart.result);
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
        {charts.map((item) => {
          const selectedProfile = profiles.find((profile) => profile.id === item.profileId && profile.id === selectedProfileId);
          const activeChartMatchesProfile = Boolean(chart && selectedProfile
            && chart.input.localDate === selectedProfile.localDate
            && chart.input.localTime === selectedProfile.localTime
            && chart.input.timeZone === selectedProfile.timeZone
            && chart.input.latitude === selectedProfile.latitude
            && chart.input.longitude === selectedProfile.longitude);
          const settingsChanged = activeChartMatchesProfile && chart
            ? savedReportSettingsChanged(item.calculationConvention, chart.settings)
            : false;
          const reportStatus = item.calculationStatus === "profile-changed"
            ? t("account.reportProfileChanged")
            : settingsChanged === true
              ? t("account.reportSettingsChanged")
              : t("account.reportSavedSnapshot");
          return <div className="account-record account-report-record" key={item.id}>
            <button type="button" disabled={busy} onClick={() => void loadSavedChart(item.id)}>
              {item.title}
              <small>{new Date(item.createdAt).toLocaleDateString()} · {t("account.reportProfile")}: {item.profileLabel ?? t("account.noProfileLink")}</small>
              <small>{t("account.reportBirthDate")}: {item.birthDate ?? t("results.unknown")}</small>
              <small>{t("account.reportSettings")}: {item.calculationConvention.join(" · ") || t("results.unknown")}</small>
              <small>{reportStatus}</small>
              <small>{t("account.reportSections")}: {item.availableSections.map((section) => t(`account.reportSection.${section}`)).join(" · ") || t("results.unknown")}</small>
            </button>
            <button type="button" aria-label={`${t("account.delete")} ${item.title}`} disabled={busy} onClick={() => void deleteChart(item.id)}>×</button>
          </div>;
        })}
        {chart && <div className="account-inline account-save-chart">
          <label>{t("account.linkProfile")}<select aria-label={t("account.linkProfile")} value={selectedProfileId} onChange={(event) => setSelectedProfileId(event.target.value)}><option value="">{t("account.noProfileLink")}</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>
          <input aria-label={t("account.chartTitle")} maxLength={120} placeholder={t("account.chartPlaceholder")} value={title} onChange={(event) => setTitle(event.target.value)} />
          <button type="button" disabled={busy || !title.trim()} onClick={() => void saveChart()}>{t("account.saveChart")}</button>
        </div>}
        <small className="account-report-pdf-note">{t("account.pdfUnavailable")}</small>
      </div>
    </> : <form className="account-auth-form" onSubmit={submitAuth}>
      {!lockAuthMode && <div className="account-mode"><button type="button" aria-pressed={mode === "login"} onClick={() => setMode("login")}>{t("account.signIn")}</button><button type="button" aria-pressed={mode === "register"} onClick={() => setMode("register")}>{t("account.register")}</button></div>}
      {mode === "register" && <label>{t("account.fullName")}<input type="text" name="fullName" minLength={1} maxLength={100} autoComplete="name" required /></label>}
      <label>{t("account.email")}<input type="email" name="email" maxLength={254} autoComplete="email" required /></label>
      <label>{t("account.password")}<input type={showPasswords ? "text" : "password"} name="password" minLength={12} maxLength={128} autoComplete={mode === "register" ? "new-password" : "current-password"} required /></label>
      {mode === "register" && <small>{t("account.passwordHelp")}</small>}
      {mode === "register" && <label>{t("account.confirmPassword")}<input type={showPasswords ? "text" : "password"} name="confirmPassword" minLength={12} maxLength={128} autoComplete="new-password" required /></label>}
      <button className="account-password-toggle" type="button" aria-pressed={showPasswords} onClick={() => setShowPasswords((visible) => !visible)}>{showPasswords ? t("account.hidePassword") : t("account.showPassword")}</button>
      {mode === "register" && <label className="account-terms-check"><input type="checkbox" name="acceptedTerms" required /> {t("account.signupTerms")} <a href="/terms-and-conditions">{t("legal.termsLink")}</a> · <a href="/privacy-policy">{t("legal.privacyLink")}</a></label>}
      {mode === "login" && <small className="account-legal-links"><a href="/terms-and-conditions">{t("legal.termsLink")}</a> · <a href="/privacy-policy">{t("legal.privacyLink")}</a></small>}
      <button className="account-action" type="submit" disabled={busy}>{busy ? t("account.wait") : mode === "register" ? t("account.register") : t("account.signIn")}</button>
      {mode === "login" && <a className="account-recovery-link" href="/forgot-password">Forgot password?</a>}
    </form>}
    {message && <p role="status" className="account-message">{t(message)}{message === "account.registrationSessionUnverified" && <> <a href={`/login?next=${encodeURIComponent(returnTo ?? "/dashboard")}`}>Sign in to continue</a>.</>}</p>}
    </div>
  </section>;
}
