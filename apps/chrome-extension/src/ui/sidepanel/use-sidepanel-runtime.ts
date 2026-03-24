import { useEffect, useState } from 'react'

import {
  getPopupState
} from '../extension-api.js'
import { toErrorMessage, type FlashState } from './helpers.js'
import type { PopupRuntimeSlice, TranslateFn } from './types.js'

export function useSidepanelRuntime(t: TranslateFn): PopupRuntimeSlice {
  const [state, setState] = useState<Awaited<ReturnType<typeof getPopupState>> | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [flash, setFlash] = useState<FlashState>()
  const [recordingName, setRecordingName] = useState('')
  const [recordingDescription, setRecordingDescription] = useState('')

  useEffect(() => {
    void load(true)
  }, [])

  useEffect(() => {
    if (state?.activeRecording && !recordingName) {
      setRecordingName(t('popup.defaultRecordingName', { name: state.activeRecording.routeClientName }))
      setRecordingDescription(t('popup.defaultRecordingDescription'))
    }
  }, [recordingDescription, recordingName, state?.activeRecording, t])

  useEffect(() => {
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined

    const scheduleRefresh = () => {
      if (timeoutId !== undefined) {
        globalThis.clearTimeout(timeoutId)
      }
      timeoutId = globalThis.setTimeout(() => {
        void load(false)
      }, 120)
    }

    const onTabUpdated = (_tabId: number, changeInfo: { status?: string; url?: string }) => {
      if (changeInfo.status === 'complete' || changeInfo.url) {
        scheduleRefresh()
      }
    }
    const onStorageChanged = (
      _changes: Record<string, chrome.storage.StorageChange>,
      areaName: chrome.storage.AreaName
    ) => {
      if (areaName === 'local') {
        scheduleRefresh()
      }
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleRefresh()
      }
    }

    chrome.tabs.onActivated.addListener(scheduleRefresh)
    chrome.tabs.onUpdated.addListener(onTabUpdated)
    chrome.tabs.onRemoved.addListener(scheduleRefresh)
    chrome.windows.onFocusChanged.addListener(scheduleRefresh)
    chrome.storage.onChanged.addListener(onStorageChanged)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      if (timeoutId !== undefined) {
        globalThis.clearTimeout(timeoutId)
      }
      chrome.tabs.onActivated.removeListener(scheduleRefresh)
      chrome.tabs.onUpdated.removeListener(onTabUpdated)
      chrome.tabs.onRemoved.removeListener(scheduleRefresh)
      chrome.windows.onFocusChanged.removeListener(scheduleRefresh)
      chrome.storage.onChanged.removeListener(onStorageChanged)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  async function load(showLoading = true) {
    try {
      if (showLoading) {
        setLoading(true)
      }
      setError(undefined)
      const next = await getPopupState()
      setState(next)
    } catch (nextError) {
      setError(toErrorMessage(nextError))
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  async function runAction(
    label: string,
    action: () => Promise<void>,
    options?: {
      suggestSelectedClientPrimary?: boolean
    }
  ) {
    try {
      setError(undefined)
      setFlash(undefined)
      await action()
      setFlash({
        message: label,
        suggestSelectedClientPrimary: options?.suggestSelectedClientPrimary
      })
      await load(false)
    } catch (nextError) {
      setError(toErrorMessage(nextError))
    }
  }

  return {
    state,
    loading,
    error,
    flash,
    recordingName,
    recordingDescription,
    setRecordingName,
    setRecordingDescription,
    runAction
  }
}
