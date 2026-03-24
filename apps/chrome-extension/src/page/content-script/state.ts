import type { PageRecordedAction } from '../messages.js'

export interface RecorderRuntimeState {
  active: boolean
  startedAt?: string
  startedAtMs: number
  steps: PageRecordedAction[]
  teardown?: () => void
}

export interface SelectorCaptureRuntimeState {
  active: boolean
  teardown?: () => void
}

declare global {
  interface Window {
    __MDP_CONTENT_SCRIPT_INSTALLED__?: boolean
    __MDP_PAGE_RECORDER__?: RecorderRuntimeState
    __MDP_SELECTOR_CAPTURE__?: SelectorCaptureRuntimeState
  }
}

export function isContentScriptInstalled(): boolean {
  return Boolean(window.__MDP_CONTENT_SCRIPT_INSTALLED__)
}

export function markContentScriptInstalled(): void {
  window.__MDP_CONTENT_SCRIPT_INSTALLED__ = true
}

export function getRecorderState(): RecorderRuntimeState | undefined {
  return window.__MDP_PAGE_RECORDER__
}

export function setRecorderState(state: RecorderRuntimeState): void {
  window.__MDP_PAGE_RECORDER__ = state
}

export function getSelectorCaptureRuntimeState(): SelectorCaptureRuntimeState | undefined {
  return window.__MDP_SELECTOR_CAPTURE__
}

export function setSelectorCaptureRuntimeState(state: SelectorCaptureRuntimeState): void {
  window.__MDP_SELECTOR_CAPTURE__ = state
}
