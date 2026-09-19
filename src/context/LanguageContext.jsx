import { useState, useEffect, useMemo, useCallback } from 'react';
import { AVAILABLE_LANGUAGES, resolveTranslation } from '../i18n/index.js';
import { LanguageContext } from './languageContextDef';

const STORAGE_KEY = 'smartfarm_language';

export function LanguageContextProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && AVAILABLE_LANGUAGES.some((l) => l.code === stored)) {
        return stored;
      }
    } catch {
      // localStorage may fail in restricted environments
    }
    return 'en';
  });

  // Safe setter that updates state and localStorage
  const setLanguage = useCallback((langCode) => {
    if (!AVAILABLE_LANGUAGES.some((l) => l.code === langCode)) return;
    setLanguageState(langCode);
    try {
      localStorage.setItem(STORAGE_KEY, langCode);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Sync html lang attribute for accessibility and screen readers
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  // Translation function bound to current language
  const t = useCallback(
    (key, params) => resolveTranslation(language, key, params),
    [language]
  );

  const currentLanguageMeta = useMemo(() => {
    return AVAILABLE_LANGUAGES.find((l) => l.code === language) || AVAILABLE_LANGUAGES[0];
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      availableLanguages: AVAILABLE_LANGUAGES,
      currentLanguageMeta,
    }),
    [language, setLanguage, t, currentLanguageMeta]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
