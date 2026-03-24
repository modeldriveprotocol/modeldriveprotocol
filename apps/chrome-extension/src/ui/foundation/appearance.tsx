import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'

import { createExtensionTheme } from './theme.js'

export type AppearancePreference = 'auto' | 'light' | 'dark'
export type AppearanceMode = 'light' | 'dark'

const UI_APPEARANCE_KEY = 'mdpUiAppearancePreference'

interface AppearanceContextValue {
  mode: AppearanceMode
  preference: AppearancePreference
  setPreference: (next: AppearancePreference) => Promise<void>
}

const AppearanceContext = createContext<AppearanceContextValue | undefined>(undefined)

function detectSystemAppearance(): AppearanceMode {
  if (!globalThis.matchMedia) {
    return 'light'
  }

  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<AppearancePreference>('auto')
  const [systemMode, setSystemMode] = useState<AppearanceMode>(detectSystemAppearance())

  useEffect(() => {
    void chrome.storage.local.get(UI_APPEARANCE_KEY).then((result) => {
      const next = result[UI_APPEARANCE_KEY]
      if (next === 'auto' || next === 'light' || next === 'dark') {
        setPreferenceState(next)
      }
    })

    const mediaQuery = globalThis.matchMedia?.('(prefers-color-scheme: dark)')
    const onMediaChange = (event: MediaQueryListEvent) => {
      setSystemMode(event.matches ? 'dark' : 'light')
    }

    if (mediaQuery) {
      if ('addEventListener' in mediaQuery) {
        mediaQuery.addEventListener('change', onMediaChange)
      } else {
        const legacyMediaQuery = mediaQuery as MediaQueryList & {
          addListener: (listener: (event: MediaQueryListEvent) => void) => void
        }
        legacyMediaQuery.addListener(onMediaChange)
      }
    }

    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: chrome.storage.AreaName
    ) => {
      if (areaName !== 'local' || !changes[UI_APPEARANCE_KEY]) {
        return
      }

      const next = changes[UI_APPEARANCE_KEY].newValue
      if (next === 'auto' || next === 'light' || next === 'dark') {
        setPreferenceState(next)
      }
    }

    chrome.storage.onChanged.addListener(onChanged)

    return () => {
      chrome.storage.onChanged.removeListener(onChanged)

      if (mediaQuery) {
        if ('removeEventListener' in mediaQuery) {
          mediaQuery.removeEventListener('change', onMediaChange)
        } else {
          const legacyMediaQuery = mediaQuery as MediaQueryList & {
            removeListener: (listener: (event: MediaQueryListEvent) => void) => void
          }
          legacyMediaQuery.removeListener(onMediaChange)
        }
      }
    }
  }, [])

  const mode = preference === 'auto' ? systemMode : preference

  useEffect(() => {
    document.documentElement.dataset.uiAppearance = mode
    document.documentElement.style.colorScheme = mode
  }, [mode])

  const value = useMemo<AppearanceContextValue>(
    () => ({
      mode,
      preference,
      async setPreference(next) {
        setPreferenceState(next)
        await chrome.storage.local.set({
          [UI_APPEARANCE_KEY]: next
        })
      }
    }),
    [mode, preference]
  )

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function ExtensionThemeProvider({ children }: { children: ReactNode }) {
  const { mode } = useAppearance()
  const theme = useMemo(() => createExtensionTheme(mode), [mode])

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>
}

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext)

  if (!context) {
    throw new Error('useAppearance must be used within AppearanceProvider')
  }

  return context
}
