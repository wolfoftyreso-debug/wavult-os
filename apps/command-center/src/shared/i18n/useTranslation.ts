// ─── useTranslation hook ─────────────────────────────────────────────────────
// Reactive i18n hook with SV/EN support
// - Loads translations from /locales/{lang}.json
// - Falls back to inline MESSAGES for agent keys
// - Fully reactive: setLanguage() re-renders all subscribed components

import { useState, useEffect, useCallback } from 'react'

type Lang = 'sv' | 'en'
export type TFunction = (key: string, params?: Record<string, string | number | undefined>) => string

// ─── Global state ─────────────────────────────────────────────────────────────

let globalLang: Lang = 'sv'
const listeners = new Set<() => void>()
const cache: Partial<Record<Lang, Record<string, string>>> = {}

// ─── Fallback inline messages (agent keys + critical paths) ──────────────────

const MESSAGES: Record<Lang, Record<string, string>> = {
  sv: {
    'agent.deadline.overdue':             'Deadline passerad — kräver omedelbar åtgärd',
    'agent.enforce.missing_dependency':   'Blockerad av beroende task',
    'agent.validation.required':          'Väntar på validering',
    'agent.deadline.today':               'Deadline idag',
    'agent.task.required':                'Kritisk task — måste påbörjas',
    'agent.task.start':                   'Påbörja task',
    'agent.task.continue':                'Fortsätt pågående task',
    'agent.command.review_now':           'Redo för granskning',
    'agent.task.completed':               'Task slutförd',
    'agent.error.generic':                'Task misslyckades',
    'agent.system.ok':                    'Alla system operativa',
    'agent.system.blocked':               'Kritiska blockers aktiva',
    'agent.system.risk':                  'Varning — tasks blockerade',
    'agent.system.no_tasks':              'Inga aktiva uppgifter',
  },
  en: {
    'agent.deadline.overdue':             'Deadline overdue — immediate action required',
    'agent.enforce.missing_dependency':   'Blocked by dependency',
    'agent.validation.required':          'Awaiting validation',
    'agent.deadline.today':               'Deadline today',
    'agent.task.required':                'Critical task — must start now',
    'agent.task.start':                   'Start task',
    'agent.task.continue':                'Continue in-progress task',
    'agent.command.review_now':           'Ready for review',
    'agent.task.completed':               'Task completed',
    'agent.error.generic':                'Task failed',
    'agent.system.ok':                    'All systems operational',
    'agent.system.blocked':               'Critical blockers active',
    'agent.system.risk':                  'Warning — tasks blocked',
    'agent.system.no_tasks':              'No active tasks',
  },
}

// ─── Language detection ───────────────────────────────────────────────────────

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem('wavult_lang') as Lang | null
    if (saved === 'sv' || saved === 'en') return saved
    const browser = navigator.language.slice(0, 2)
    if (browser === 'en') return 'en'
  } catch {
    // localStorage may not be available
  }
  return 'sv'
}

// ─── Locale loader ────────────────────────────────────────────────────────────

async function loadLocale(lang: Lang): Promise<Record<string, string>> {
  if (cache[lang]) return cache[lang]!
  try {
    const res = await fetch(`/locales/${lang}.json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: Record<string, string> = await res.json()
    cache[lang] = data
    return data
  } catch {
    // Fall back to inline messages
    return MESSAGES[lang] ?? {}
  }
}

// ─── Translation resolver ─────────────────────────────────────────────────────

function resolveKey(
  key: string,
  locale: Record<string, string>,
  lang: Lang,
  params?: Record<string, string | number | undefined>
): string {
  // Prefer loaded locale, fall back to inline MESSAGES
  const template =
    locale[key] ??
    MESSAGES[lang]?.[key] ??
    MESSAGES['sv']?.[key] ??
    key

  if (!params) return template

  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? `{{${k}}}`))
    // Also handle legacy {key} format from original MESSAGES
    .replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function setLanguage(lang: Lang): void {
  globalLang = lang
  try {
    localStorage.setItem('wavult_lang', lang)
  } catch { /* ignore */ }
  // Invalidate cache to force reload
  delete cache[lang]
  listeners.forEach(fn => fn())
}

export function getCurrentLang(): Lang {
  return globalLang
}

/** Synchronous translation — uses inline MESSAGES only (safe for non-hook contexts) */
export function getDefaultTranslation(
  key: string,
  params?: Record<string, string | number | undefined>
): string {
  const locale = cache[globalLang] ?? {}
  return resolveKey(key, locale, globalLang, params)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTranslation(): { t: TFunction; lang: Lang; setLanguage: typeof setLanguage } {
  const [lang, setLang] = useState<Lang>(globalLang)
  const [locale, setLocale] = useState<Record<string, string>>(cache[globalLang] ?? {})

  useEffect(() => {
    // Initialize from storage
    const detected = detectLang()
    globalLang = detected
    setLang(detected)
    loadLocale(detected).then(data => {
      cache[detected] = data
      setLocale(data)
    })

    // Subscribe to language changes
    const refresh = () => {
      const l = globalLang
      setLang(l)
      loadLocale(l).then(data => {
        cache[l] = data
        setLocale(data)
      })
    }
    listeners.add(refresh)
    return () => { listeners.delete(refresh) }
  }, [])

  const t = useCallback<TFunction>((key, params) => {
    return resolveKey(key, locale, lang, params)
  }, [locale, lang])

  return { t, lang, setLanguage }
}
