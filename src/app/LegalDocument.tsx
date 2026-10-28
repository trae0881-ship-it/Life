"use client";

import { useEffect, useState } from "react";
import { readLanguagePreference, writeLanguagePreference } from "@/presentation/language-preference";
import { translate, type Language } from "@/presentation/language";

type DocumentKind = "terms" | "privacy" | "disclaimer" | "refund";
const sections: Record<DocumentKind, string[]> = {
  terms: ["service", "features", "accuracy", "predictions", "assistant", "accounts", "retention", "acceptance", "payments"],
  privacy: ["collected", "use", "storage", "history", "access", "deletion", "security", "sharing"],
  disclaimer: ["nature", "accuracy", "outcomes", "professional", "devotional"],
  refund: ["payments"],
};

export default function LegalDocument({ kind }: { kind: DocumentKind }) {
  const [language, setLanguage] = useState<Language>("en");
  const t = (key: string) => translate(language, key);
  useEffect(() => setLanguage(readLanguagePreference(window.localStorage)), []);

  function changeLanguage(value: string) {
    if (value !== "en" && value !== "hi" && value !== "hinglish") return;
    setLanguage(value);
    writeLanguagePreference(window.localStorage, value);
  }

  return <main className="legal-page">
    <header className="legal-header">
      <a href="/" className="legal-brand">LIFE <span>Jyotish Workbench</span></a>
      <label>{t("language.label")}<select value={language} onChange={(event) => changeLanguage(event.target.value)}><option value="en">English</option><option value="hi">हिन्दी</option><option value="hinglish">Hinglish</option></select></label>
    </header>
    <article className="legal-card">
      <nav className="legal-nav" aria-label={t("legal.navigation")}>
        <a href="/terms-and-conditions">{t("legal.termsLink")}</a>
        <a href="/privacy-policy">{t("legal.privacyLink")}</a>
        <a href="/disclaimer">{t("legal.disclaimerLink")}</a>
        <a href="/refund-policy">{t("legal.refundLink")}</a>
      </nav>
      <p className="legal-kicker">LIFE · {t("legal.lastUpdated")}</p>
      <h1>{t(`legal.${kind}Title`)}</h1>
      {kind === "terms" && <p className="legal-version">{t("legal.versionNotice")}</p>}
      {sections[kind].map((section) => <section key={section}>
        <h2>{t(`legal.${kind}.${section}.title`)}</h2>
        <p>{t(`legal.${kind}.${section}.body`)}</p>
      </section>)}
      <div className="legal-related">
        <h2>{t("legal.related")}</h2>
        <a href="/terms-and-conditions">{t("legal.termsLink")}</a>
        <a href="/privacy-policy">{t("legal.privacyLink")}</a>
        <a href="/disclaimer">{t("legal.disclaimerLink")}</a>
        <a href="/refund-policy">{t("legal.refundLink")}</a>
      </div>
    </article>
  </main>;
}
