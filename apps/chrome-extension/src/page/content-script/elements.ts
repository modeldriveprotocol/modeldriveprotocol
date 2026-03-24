import { truncateText } from '#~/shared/utils.js'
import type { PageCommand, PageElementSummary, PageRecordedAction, PageSnapshot } from '../messages.js'
import {
  resolveElement,
  serializeElement
} from './selectors.js'

export function buildPageSnapshot(maxTextLength: number): PageSnapshot {
  const selection = window.getSelection()?.toString().trim() ?? ''
  const headings = [...document.querySelectorAll('h1, h2, h3')]
    .map((element) => element.textContent?.trim() ?? '')
    .filter((text) => text.length > 0)
    .slice(0, 10)

  return {
    title: document.title,
    url: location.href,
    language: document.documentElement.lang || navigator.language,
    readyState: document.readyState,
    selection,
    headings,
    bodyText: truncateText(document.body?.innerText?.trim() ?? '', maxTextLength)
  }
}

export function queryElements(selector: string, maxResults: number): PageElementSummary[] {
  if (!selector.trim()) {
    throw new Error('Selector is required')
  }

  return [...document.querySelectorAll(selector)]
    .slice(0, maxResults)
    .map((element, index) => serializeElement(element, index))
}

export function clickElement(selector: string, index: number): { clicked: boolean; target: PageElementSummary } {
  const element = resolveElement(selector, index)

  if (!(element instanceof HTMLElement)) {
    throw new Error(`Selector "${selector}" did not resolve to an HTMLElement`)
  }

  element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' })
  element.click()

  return { clicked: true, target: serializeElement(element, index) }
}

export function fillElement(
  selector: string,
  value: string,
  index: number
): { filled: boolean; target: PageElementSummary } {
  const element = resolveElement(selector, index)

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    if (element instanceof HTMLInputElement && element.type === 'checkbox') {
      element.checked = value === 'true'
    } else {
      element.value = value
    }

    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
    return { filled: true, target: serializeElement(element, index) }
  }

  if (element instanceof HTMLElement && element.isContentEditable) {
    element.focus()
    element.textContent = value
    element.dispatchEvent(new Event('input', { bubbles: true }))
    return { filled: true, target: serializeElement(element, index) }
  }

  throw new Error(`Selector "${selector}" did not resolve to a fillable element`)
}

export function focusElement(selector: string, index: number): { focused: true; target: PageElementSummary } {
  const element = resolveElement(selector, index)

  if (!('focus' in element) || typeof element.focus !== 'function') {
    throw new Error(`Selector "${selector}" did not resolve to a focusable element`)
  }

  element.focus()
  return { focused: true, target: serializeElement(element, index) }
}

export function pressKey(command: Extract<PageCommand, { type: 'pressKey' }>): { pressed: boolean; key: string; target: string } {
  if (!command.key.trim()) {
    throw new Error('key is required')
  }

  const target = command.selector?.trim() ? resolveElement(command.selector, 0) : document.activeElement ?? document.body

  if (target instanceof HTMLElement) {
    target.focus()
  }

  const init = {
    key: command.key,
    code: command.code ?? command.key,
    bubbles: true,
    cancelable: true,
    altKey: command.altKey ?? false,
    ctrlKey: command.ctrlKey ?? false,
    metaKey: command.metaKey ?? false,
    shiftKey: command.shiftKey ?? false
  }

  target.dispatchEvent(new KeyboardEvent('keydown', init))
  target.dispatchEvent(new KeyboardEvent('keyup', init))

  return {
    pressed: true,
    key: command.key,
    target: target instanceof Element ? target.tagName.toLowerCase() : target === document.body ? 'body' : 'document'
  }
}

export function scrollToPosition(
  top: number | undefined,
  left: number | undefined,
  behavior: 'auto' | 'smooth'
): { top: number; left: number; behavior: 'auto' | 'smooth' } {
  window.scrollTo({ top: top ?? window.scrollY, left: left ?? window.scrollX, behavior })
  return { top: top ?? window.scrollY, left: left ?? window.scrollX, behavior }
}

export function scrollElementIntoView(
  command: Extract<PageCommand, { type: 'scrollIntoView' }>
): { scrolled: true; behavior: 'auto' | 'smooth'; block: 'start' | 'center' | 'end' | 'nearest'; inline: 'start' | 'center' | 'end' | 'nearest'; target: PageElementSummary } {
  const index = command.index ?? 0
  const element = resolveElement(command.selector, index)
  const behavior = command.behavior ?? 'auto'
  const block = command.block ?? 'center'
  const inline = command.inline ?? 'nearest'

  element.scrollIntoView({ behavior, block, inline })
  return { scrolled: true, behavior, block, inline, target: serializeElement(element, index) }
}

export function readElementValue(target: Element): string | undefined {
  if (target instanceof HTMLInputElement) {
    return target.type === 'checkbox' ? String(target.checked) : target.value
  }
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return target.value
  }
  if (target instanceof HTMLElement && target.isContentEditable) {
    return target.innerText
  }
  return undefined
}

export function summarizeRecordedFeatures(steps: PageRecordedAction[]): string[] {
  const features = new Set<string>()
  for (const step of steps) {
    features.add(`${step.type}:${step.selector}`)
    if (step.label) features.add(`label:${step.label}`)
    if (step.text) features.add(`text:${truncateText(step.text, 48)}`)
  }
  return [...features]
}
