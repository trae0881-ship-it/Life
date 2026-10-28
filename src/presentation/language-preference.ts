import { isLanguage, type Language } from "./language.ts";

export const LANGUAGE_STORAGE_KEY = "life-language";

export interface LanguageStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readLanguagePreference(storage: LanguageStorage): Language {
  const stored = storage.getItem(LANGUAGE_STORAGE_KEY);
  return isLanguage(stored) ? stored : "en";
}

export function writeLanguagePreference(storage: LanguageStorage, language: Language) {
  storage.setItem(LANGUAGE_STORAGE_KEY, language);
}
