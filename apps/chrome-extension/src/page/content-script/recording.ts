import { createRequestId, normalizeForMessaging } from '#~/shared/utils.js'
import type {
  PageRecordedAction,
  PageRecordingResult,
  PageRecordingState,
  PageSelectorCaptureState
} from '../messages.js'
import {
  readElementValue,
  summarizeRecordedFeatures
} from './elements.js'
import { describeElementForCapture, serializeSelectorCapture } from './selectors.js'
import {
  type RecorderRuntimeState,
  getRecorderState,
  getSelectorCaptureRuntimeState,
  setRecorderState,
  setSelectorCaptureRuntimeState
} from './state.js'

export function startRecording(): PageRecordingState {
  stopRecordingListeners()
  const startedAtMs = Date.now()
  const state: RecorderRuntimeState = {
    active: true,
    startedAt: new Date(startedAtMs).toISOString(),
    startedAtMs,
    steps: []
  }

  const clickHandler = (event: Event) => {
    const target = event.target instanceof Element ? event.target : undefined
    if (target) {
      recordAction(state, { type: 'click', ...describeElementForCapture(target), timestampOffsetMs: Date.now() - startedAtMs })
    }
  }

  const changeHandler = (event: Event) => {
    const target = event.target instanceof Element ? event.target : undefined
    if (!target) return
    const value = readElementValue(target)
    if (value === undefined) return
    recordAction(state, {
      type: 'fill',
      ...describeElementForCapture(target),
      timestampOffsetMs: Date.now() - startedAtMs,
      value
    })
  }

  const keyHandler = (event: KeyboardEvent) => {
    if (!shouldCaptureKeyboardEvent(event)) return
    const target = event.target instanceof Element ? event.target : undefined
    const descriptor = target ? describeElementForCapture(target) : undefined
    recordAction(state, {
      type: 'pressKey',
      ...(descriptor ?? { selector: 'body', alternativeSelectors: [], tagName: 'body', classes: [] }),
      timestampOffsetMs: Date.now() - startedAtMs,
      key: event.key,
      code: event.code
    })
  }

  document.addEventListener('click', clickHandler, true)
  document.addEventListener('change', changeHandler, true)
  document.addEventListener('keydown', keyHandler, true)

  state.teardown = () => {
    document.removeEventListener('click', clickHandler, true)
    document.removeEventListener('change', changeHandler, true)
    document.removeEventListener('keydown', keyHandler, true)
  }

  setRecorderState(state)
  return getRecordingState()
}

export function stopRecording(): PageRecordingResult {
  const state = getRecorderState()
  if (!state?.active || !state.startedAt) {
    throw new Error('Recording is not active')
  }

  stopRecordingListeners()
  return {
    startedAt: state.startedAt,
    finishedAt: new Date().toISOString(),
    url: location.href,
    title: document.title,
    steps: state.steps,
    capturedFeatures: summarizeRecordedFeatures(state.steps)
  }
}

export function getRecordingState(): PageRecordingState {
  const state = getRecorderState()
  return {
    active: Boolean(state?.active),
    ...(state?.startedAt ? { startedAt: state.startedAt } : {}),
    stepCount: state?.steps.length ?? 0
  }
}

export function startSelectorCapture(): PageSelectorCaptureState {
  cancelSelectorCapture()

  const clickHandler = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : undefined
    if (!target) return

    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()

    void chrome.runtime.sendMessage({
      type: 'page:selectorCaptured',
      data: normalizeForMessaging(serializeSelectorCapture(target))
    })
    cancelSelectorCapture()
  }

  document.addEventListener('click', clickHandler, true)
  document.documentElement.style.cursor = 'crosshair'
  setSelectorCaptureRuntimeState({
    active: true,
    teardown: () => {
      document.removeEventListener('click', clickHandler, true)
      document.documentElement.style.removeProperty('cursor')
    }
  })

  return { active: true }
}

export function cancelSelectorCapture(): PageSelectorCaptureState {
  getSelectorCaptureRuntimeState()?.teardown?.()
  setSelectorCaptureRuntimeState({ active: false })
  return { active: false }
}

export function getSelectorCaptureState(): PageSelectorCaptureState {
  return { active: Boolean(getSelectorCaptureRuntimeState()?.active) }
}

function stopRecordingListeners(): void {
  getRecorderState()?.teardown?.()
  setRecorderState({ active: false, startedAtMs: 0, steps: [] })
}

function recordAction(state: RecorderRuntimeState, action: Omit<PageRecordedAction, 'id'>): void {
  const previous = state.steps.at(-1)
  if (previous && previous.type === action.type && previous.selector === action.selector && action.type === 'fill') {
    state.steps[state.steps.length - 1] = { ...previous, ...action, id: previous.id }
    return
  }
  state.steps.push({ id: createRequestId('recorded-step'), ...action })
}

function shouldCaptureKeyboardEvent(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return true
  }
  return ['Enter', 'Escape', 'Tab', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)
}
