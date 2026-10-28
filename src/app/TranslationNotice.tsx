"use client";

import { useEffect, useState } from "react";
import { translate, type Language } from "@/presentation/language";
import { readLanguagePreference } from "@/presentation/language-preference";

export default function TranslationNotice() {
  const [language, setLanguage] = useState<Language>("en");
  useEffect(() => {
    setLanguage(readLanguagePreference(window.localStorage));
  }, []);

  return <p className="translation-availability" role="status">
    {translate(language, "translation.englishOnlyNotice")} <a href="/">{translate(language, "nav.chart")}</a>
  </p>;
}
