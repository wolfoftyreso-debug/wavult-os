import type { Locale } from './context';

const VALID_LOCALES: Locale[] = ['sv', 'en', 'de', 'no', 'da', 'fi'];
const STORAGE_KEY = 'pixdrift_locale';

/**
 * Detect the user's preferred locale from:
 * 1. localStorage (persisted user choice)
 * 2. Browser navigator.language
 * 3. Falls back to 'sv'
 */
export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && VALID_LOCALES.includes(saved)) return saved;

    const browserLang = navigator.language.split('-')[0] as Locale;
    if (VALID_LOCALES.includes(browserLang)) return browserLang;
  } catch {
    // Server-side rendering or sandboxed environment
  }
  return 'sv';
}

/**
 * Persist a locale choice to localStorage.
 */
export function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // noop
  }
}

export { VALID_LOCALES };
