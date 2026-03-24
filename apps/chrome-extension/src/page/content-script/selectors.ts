import { truncateText } from '#~/shared/utils.js'
import type {
  PageElementSummary,
  PageRecordedAction,
  PageSelectorCaptureResult
} from '../messages.js'

export function serializeSelectorCapture(element: Element): PageSelectorCaptureResult {
  const description = describeElementForCapture(element)

  return {
    selector: description.selector,
    alternativeSelectors: description.alternativeSelectors,
    tagName: description.tagName,
    classes: description.classes,
    ...(description.text ? { text: description.text } : {}),
    attributes: collectUsefulAttributes(element),
    url: location.href
  }
}

export function describeElementForCapture(
  element: Element
): Omit<PageRecordedAction, 'id' | 'type' | 'timestampOffsetMs' | 'value' | 'key' | 'code'> {
  const selectors = buildElementSelectors(element)
  const htmlElement = element as HTMLElement
  const text = truncateText(htmlElement.innerText?.trim() ?? element.textContent?.trim() ?? '', 120)
  const label = findLabelText(element)

  return {
    selector: selectors[0] ?? element.tagName.toLowerCase(),
    alternativeSelectors: selectors.slice(1, 5),
    tagName: element.tagName.toLowerCase(),
    classes: [...element.classList].slice(0, 6),
    ...(text ? { text } : {}),
    ...(label ? { label } : {}),
    ...(element instanceof HTMLInputElement ? { inputType: element.type } : {})
  }
}

export function resolveElement(selector: string, index: number): Element {
  if (!selector.trim()) {
    throw new Error('Selector is required')
  }
  const element = document.querySelectorAll(selector).item(index)
  if (!element) {
    throw new Error(`No element found for selector "${selector}" at index ${index}`)
  }
  return element
}

export function serializeElement(element: Element, index: number): PageElementSummary {
  const htmlElement = element as HTMLElement
  const inputElement = element as HTMLInputElement

  return {
    index,
    tagName: element.tagName.toLowerCase(),
    ...(element.id ? { id: element.id } : {}),
    classes: [...element.classList],
    text: truncateText(htmlElement.innerText?.trim() ?? element.textContent?.trim() ?? '', 280),
    ...(typeof inputElement.value === 'string' && inputElement.value.length > 0 ? { value: truncateText(inputElement.value, 160) } : {}),
    ...(element instanceof HTMLAnchorElement && element.href ? { href: element.href } : {}),
    ...(element instanceof HTMLInputElement && element.type === 'checkbox' ? { checked: element.checked } : {}),
    ...(htmlElement instanceof HTMLElement ? { disabled: htmlElement.matches(':disabled') } : {})
  }
}

function buildElementSelectors(element: Element): string[] {
  const selectors: string[] = []
  const htmlElement = element as HTMLElement
  const pushSelector = (selector: string | undefined) => {
    const normalized = selector?.trim()
    if (normalized && !selectors.includes(normalized)) {
      selectors.push(normalized)
    }
  }

  if (element.id) pushSelector(`#${escapeCssIdentifier(element.id)}`)
  const dataset = htmlElement.dataset
  pushSelector(dataset.testid ? `[data-testid="${escapeAttributeValue(dataset.testid)}"]` : undefined)
  pushSelector(dataset.testId ? `[data-test-id="${escapeAttributeValue(dataset.testId)}"]` : undefined)

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    pushSelector(element.name ? `${element.tagName.toLowerCase()}[name="${escapeAttributeValue(element.name)}"]` : undefined)
    pushSelector(element.placeholder ? `${element.tagName.toLowerCase()}[placeholder="${escapeAttributeValue(element.placeholder)}"]` : undefined)
  }

  const ariaLabel = element.getAttribute('aria-label')
  pushSelector(ariaLabel ? `${element.tagName.toLowerCase()}[aria-label="${escapeAttributeValue(ariaLabel)}"]` : undefined)

  if (element.classList.length > 0) {
    pushSelector(`${element.tagName.toLowerCase()}.${[...element.classList].slice(0, 3).map((name) => escapeCssIdentifier(name)).join('.')}`)
  }

  pushSelector(buildDomPathSelector(element))
  return selectors
}

function buildDomPathSelector(element: Element): string {
  const segments: string[] = []
  let current: Element | null = element

  while (current && segments.length < 5 && current !== document.body) {
    const tagName = current.tagName.toLowerCase()
    if (current.id) {
      segments.unshift(`#${escapeCssIdentifier(current.id)}`)
      break
    }

    let segment = tagName
    if (current.classList.length > 0) {
      segment += `.${[...current.classList].slice(0, 2).map((name) => escapeCssIdentifier(name)).join('.')}`
    } else if (current.parentElement) {
      const siblings = [...current.parentElement.children].filter((candidate) => candidate.tagName === current?.tagName)
      if (siblings.length > 1) {
        segment += `:nth-of-type(${siblings.indexOf(current) + 1})`
      }
    }

    segments.unshift(segment)
    current = current.parentElement
  }

  return segments.join(' > ')
}

function findLabelText(element: Element): string | undefined {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    if (element.labels?.length) {
      return truncateText(element.labels[0].innerText.trim(), 120)
    }
  }

  const labelledById = element.getAttribute('aria-labelledby')
  if (labelledById) {
    const labelElement = document.getElementById(labelledById)
    if (labelElement?.textContent?.trim()) {
      return truncateText(labelElement.textContent.trim(), 120)
    }
  }
  return undefined
}

function collectUsefulAttributes(element: Element): Record<string, string> {
  const attributes: Record<string, string> = {}
  for (const attributeName of ['id', 'name', 'role', 'aria-label', 'href', 'type', 'placeholder']) {
    const value = element.getAttribute(attributeName)
    if (value?.trim()) {
      attributes[attributeName] = value.trim()
    }
  }
  return attributes
}

function escapeCssIdentifier(value: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(value)
    : value.replace(/[^a-zA-Z0-9_-]/g, '\\$&')
}

function escapeAttributeValue(value: string): string {
  return value.replace(/"/g, '\\"')
}
