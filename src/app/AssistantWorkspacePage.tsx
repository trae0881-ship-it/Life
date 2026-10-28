"use client";

import { useEffect, useState } from "react";
import KundliAssistant from "./KundliAssistant";
import { readLanguagePreference, writeLanguagePreference } from "@/presentation/language-preference";
import { translate, type Language } from "@/presentation/language";
import "./kundli.css";
import "./responsive.css";

export default function AssistantWorkspacePage() {
  const [language, setLanguage] = useState<Language>("en");
  const t = (key: string) => translate(language, key);
  useEffect(() => setLanguage(readLanguagePreference(window.localStorage)), []);
  function changeLanguage(value: string) {
    if (value !== "en" && value !== "hi" && value !== "hinglish") return;
    setLanguage(value);
    writeLanguagePreference(window.localStorage, value);
  }
  return <main className="assistant-workspace">
    <header><a className="legal-brand" href="/">LIFE <span>{t("app.workbench")}</span></a>
      <label>{t("language.label")}<select value={language} onChange={(event) => changeLanguage(event.target.value)}><option value="en">English</option><option value="hi">हिन्दी</option><option value="hinglish">Hinglish</option></select></label>
    </header>
    <nav className="assistant-workspace-links"><a href="/dashboard/assistant">{t("assistant.title")}</a><a href="/dashboard/questions">{t("assistant.historyTitle")}</a><a href="/terms-and-conditions">{t("legal.termsLink")}</a><a href="/privacy-policy">{t("legal.privacyLink")}</a></nav>
    <KundliAssistant chart={null} language={language} />
  </main>;
}
