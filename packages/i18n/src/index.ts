// Main entry point for @pixdrift/i18n

// Context & hooks
export { LanguageProvider, useTranslation } from './context';
export type { Locale, I18nContextType } from './context';

// Language switcher component
export { LanguageSwitcher } from './LanguageSwitcher';

// Locale detection utilities
export { detectLocale, persistLocale, VALID_LOCALES } from './detector';

// Formatters
export {
  formatDate,
  formatDateLong,
  formatDateShort,
  formatDateTime,
  formatCurrency,
  formatNumber,
  formatPercent,
  localeToIntl,
} from './formatters';
