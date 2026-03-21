import React, { createContext, useContext, useState, useEffect } from 'react';

export type Locale = 'sv' | 'en' | 'de' | 'no' | 'da' | 'fi';

export interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  availableLocales: { code: Locale; name: string; flag: string }[];
}

const I18nContext = createContext<I18nContextType | null>(null);

// Flat translations cache (dot notation: "nav.overview" → "Översikt")
const translations: Record<Locale, Record<string, string>> = {
  sv: {}, en: {}, de: {}, no: {}, da: {}, fi: {},
};

const loaded: Set<Locale> = new Set();

async function loadLocale(locale: Locale): Promise<void> {
  if (loaded.has(locale)) return;
  const mod = await import(`./locales/${locale}.json`);
  translations[locale] = flattenObject(mod.default ?? mod);
  loaded.add(locale);
}

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  return Object.keys(obj).reduce((acc, key) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(acc, flattenObject(val as Record<string, unknown>, fullKey));
    } else {
      acc[fullKey] = String(val);
    }
    return acc;
  }, {} as Record<string, string>);
}

const VALID_LOCALES: Locale[] = ['sv', 'en', 'de', 'no', 'da', 'fi'];

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem('pixdrift_locale') as Locale;
    if (saved && VALID_LOCALES.includes(saved)) return saved;
    const browser = navigator.language.split('-')[0] as Locale;
    if (VALID_LOCALES.includes(browser)) return browser;
  } catch {
    // SSR / no localStorage
  }
  return 'sv';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    loadLocale(locale).then(() => setReady(true));
  }, [locale]);

  function setLocale(newLocale: Locale) {
    try { localStorage.setItem('pixdrift_locale', newLocale); } catch { /* noop */ }
    setLocaleState(newLocale);
  }

  function t(key: string, params?: Record<string, string | number>): string {
    let str =
      translations[locale]?.[key] ??
      translations['sv']?.[key] ??
      key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{{${k}}}`, String(v));
      }
    }
    return str;
  }

  const availableLocales: { code: Locale; name: string; flag: string }[] = [
    { code: 'sv', name: 'Svenska',  flag: '🇸🇪' },
    { code: 'en', name: 'English',  flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch',  flag: '🇩🇪' },
    { code: 'no', name: 'Norsk',    flag: '🇳🇴' },
    { code: 'da', name: 'Dansk',    flag: '🇩🇰' },
    { code: 'fi', name: 'Suomi',    flag: '🇫🇮' },
  ];

  if (!ready) return null;

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, availableLocales }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used inside <LanguageProvider>');
  return ctx;
}
