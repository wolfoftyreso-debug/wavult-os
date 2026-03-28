import { useTranslation, setLanguage } from './useTranslation'

export function LanguageToggle() {
  const { lang } = useTranslation()

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
      <button
        onClick={() => setLanguage('sv')}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
          lang === 'sv'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        aria-label="Svenska"
      >
        SV
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
          lang === 'en'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        aria-label="English"
      >
        EN
      </button>
    </div>
  )
}
