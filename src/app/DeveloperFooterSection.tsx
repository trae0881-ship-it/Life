"use client";

import { useEffect, useRef, useState } from "react";
import { readLanguagePreference } from "@/presentation/language-preference";
import { translate, type Language } from "@/presentation/language";

export default function DeveloperFooterSection() {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [role, setRole] = useState<string | null>(null);
  const section = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const t = (key: string) => translate(language, key);

  useEffect(() => {
    setLanguage(readLanguagePreference(window.localStorage));
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setRole(null);
    const refreshRole = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (active) setRole(null);
          return;
        }
        const result = await response.json() as { user: { role: string } | null };
        if (active) setRole(result.user?.role ?? null);
      } catch {
        if (active) setRole(null);
      }
    };
    void refreshRole();
    window.addEventListener("life-account-changed", refreshRole);
    return () => {
      active = false;
      window.removeEventListener("life-account-changed", refreshRole);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !section.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [open]);

  return <section className="global-footer-developer" ref={section}>
    <button
      className="global-footer-developer-trigger"
      type="button"
      ref={trigger}
      aria-expanded={open}
      aria-controls="global-footer-developer-panel"
      onClick={() => setOpen((value) => !value)}
    >
      {t("developer.footer.title")}
    </button>
    {open && <div className="global-footer-developer-panel" id="global-footer-developer-panel" role="region" aria-label={t("developer.footer.panelLabel")}>
      <h2>{t("developer.footer.heading")}</h2>
      <p>{t("developer.footer.description")}</p>
      <p>{t("developer.footer.access")}</p>
      <div className="global-footer-developer-resources" aria-label={t("developer.footer.resources")}>
        <a href="/developers">{t("developer.footer.portal")}</a>
        <a href="/api/docs">{t("developer.footer.apiDocs")}</a>
        <a href="/api/openapi.json">{t("developer.footer.openapi")}</a>
        {role === "DEVELOPER" && <a href="/developers/dashboard">{t("developer.footer.dashboard")}</a>}
      </div>
      <div className="global-footer-developer-actions">
        <a href="/developer/login?next=%2Fdevelopers%2Fdashboard">{t("developer.footer.login")}</a>
        <a href="/developer/signup">{t("developer.footer.createAccount")}</a>
      </div>
      <p className="global-footer-developer-note">{t("developer.footer.approval")}</p>
    </div>}
  </section>;
}
