import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'

import { marketMessages } from './market-messages.js'
import { commonMessages } from './common-messages.js'
import { optionsMessages } from './options-messages.js'
import { optionsShellMessages } from './options-shell-messages.js'
import { popupMessages } from './popup-messages.js'
import type { Locale, LocalePreference } from './types.js'

const UI_LOCALE_KEY = 'mdpUiLocalePreference'

const messages: Record<Locale, Record<string, string>> = {
  en: {
    ...commonMessages.en,
    ...popupMessages.en,
    ...optionsShellMessages.en,
    ...optionsMessages.en,
    ...marketMessages.en
  },
  'zh-CN': {
    ...commonMessages['zh-CN'],
    ...popupMessages['zh-CN'],
    ...optionsShellMessages['zh-CN'],
    ...optionsMessages['zh-CN'],
    ...marketMessages['zh-CN']
  }
}

interface I18nContextValue {
  locale: Locale
  preference: LocalePreference
  setPreference: (next: LocalePreference) => Promise<void>
  t: (key: string, vars?: Record<string, string | number | undefined>) => string
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

function resolveLocale(input: string | undefined): Locale {
  const normalized = input?.toLowerCase() ?? ''
  return normalized.startsWith('zh') ? 'zh-CN' : 'en'
}

function interpolate(template: string, vars?: Record<string, string | number | undefined>): string {
  if (!vars) {
    return template
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(vars[key] ?? ''))
}

function detectLocale(): Locale {
  const browserLocale = chrome.i18n?.getUILanguage?.() ?? navigator.language
  return resolveLocale(browserLocale)
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LocalePreference>('auto')

  useEffect(() => {
    void chrome.storage.local.get(UI_LOCALE_KEY).then((result) => {
      const next = result[UI_LOCALE_KEY]
      if (next === 'auto' || next === 'en' || next === 'zh-CN') {
        setPreferenceState(next)
      }
    })

    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: chrome.storage.AreaName
    ) => {
      if (areaName !== 'local' || !changes[UI_LOCALE_KEY]) {
        return
      }

      const next = changes[UI_LOCALE_KEY].newValue
      if (next === 'auto' || next === 'en' || next === 'zh-CN') {
        setPreferenceState(next)
      }
    }

    chrome.storage.onChanged.addListener(onChanged)
    return () => chrome.storage.onChanged.removeListener(onChanged)
  }, [])

  const locale = preference === 'auto' ? detectLocale() : preference

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      preference,
      async setPreference(next) {
        setPreferenceState(next)
        await chrome.storage.local.set({
          [UI_LOCALE_KEY]: next
        })
      },
      t(key, vars) {
        const template = messages[locale][key] ?? messages.en[key] ?? key
        return interpolate(template, vars)
      }
    }),
    [locale, preference]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }

  return context
}

export type { Locale, LocalePreference } from './types.js'
