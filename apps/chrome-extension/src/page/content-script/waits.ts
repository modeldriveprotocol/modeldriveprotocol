import { describeUrlMatchCondition, matchesUrlCondition } from '#~/shared/utils.js'
import type { PageCommand, PageElementSummary } from '../messages.js'
import { countVisibleElements, queryVisibleElements } from '../visibility.js'
import { serializeElement } from './selectors.js'

export function waitForText(text: string, timeoutMs: number): Promise<{ found: true; text: string; elapsedMs: number }> {
  if (!text.trim()) {
    throw new Error('text is required')
  }

  const startedAt = Date.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      if ((document.body?.innerText ?? '').includes(text)) {
        cleanup()
        resolve({ found: true, text, elapsedMs: Date.now() - startedAt })
      }
    }
    const interval = window.setInterval(check, 200)
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error(`Timed out waiting for text "${text}"`))
    }, timeoutMs)
    const observer = new MutationObserver(check)
    const cleanup = () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
      observer.disconnect()
    }
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true })
    check()
  })
}

export function waitForSelector(selector: string, timeoutMs: number): Promise<{ found: true; selector: string; elapsedMs: number }> {
  if (!selector.trim()) {
    throw new Error('selector is required')
  }

  const startedAt = Date.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      if (document.querySelector(selector)) {
        cleanup()
        resolve({ found: true, selector, elapsedMs: Date.now() - startedAt })
      }
    }
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error(`Timed out waiting for selector "${selector}"`))
    }, timeoutMs)
    const observer = new MutationObserver(check)
    const cleanup = () => {
      window.clearTimeout(timeout)
      observer.disconnect()
    }
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true })
    check()
  })
}

export function waitForVisible(command: Extract<PageCommand, { type: 'waitForVisible' }>): Promise<{ found: true; selector: string; index: number; elapsedMs: number; target: PageElementSummary }> {
  if (!command.selector.trim()) {
    throw new Error('selector is required')
  }

  const index = command.index ?? 0
  const startedAt = Date.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      const visibleElements = queryVisibleElements(document, command.selector)
      const element = visibleElements.at(index)
      if (element) {
        cleanup()
        resolve({
          found: true,
          selector: command.selector,
          index,
          elapsedMs: Date.now() - startedAt,
          target: serializeElement(element, index)
        })
      }
    }
    const interval = window.setInterval(check, 150)
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error(`Timed out waiting for visible selector "${command.selector}" at visible index ${index}`))
    }, command.timeoutMs ?? 10_000)
    const observer = new MutationObserver(check)
    const cleanup = () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
      observer.disconnect()
    }
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true })
    check()
  })
}

export function waitForHidden(command: Extract<PageCommand, { type: 'waitForHidden' }>): Promise<{ hidden: true; selector: string; elapsedMs: number; totalMatches: number; visibleMatches: number }> {
  if (!command.selector.trim()) {
    throw new Error('selector is required')
  }

  const startedAt = Date.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      const counts = countVisibleElements(document, command.selector)
      if (counts.visibleMatches === 0) {
        cleanup()
        resolve({
          hidden: true,
          selector: command.selector,
          elapsedMs: Date.now() - startedAt,
          totalMatches: counts.totalMatches,
          visibleMatches: counts.visibleMatches
        })
      }
    }
    const interval = window.setInterval(check, 150)
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error(`Timed out waiting for hidden selector "${command.selector}"`))
    }, command.timeoutMs ?? 10_000)
    const observer = new MutationObserver(check)
    const cleanup = () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
      observer.disconnect()
    }
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true })
    check()
  })
}

export function waitForUrl(command: Extract<PageCommand, { type: 'waitForUrl' }>): Promise<{ found: true; url: string; elapsedMs: number }> {
  const condition = {
    ...(command.url ? { url: command.url } : {}),
    ...(command.includes ? { includes: command.includes } : {}),
    ...(command.matches ? { matches: command.matches } : {})
  }
  const description = describeUrlMatchCondition(condition)
  const startedAt = Date.now()

  return new Promise((resolve, reject) => {
    const check = () => {
      const currentUrl = location.href
      if (matchesUrlCondition(currentUrl, condition)) {
        cleanup()
        resolve({ found: true, url: currentUrl, elapsedMs: Date.now() - startedAt })
      }
    }
    const interval = window.setInterval(check, 100)
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error(`Timed out waiting for ${description}`))
    }, command.timeoutMs ?? 10_000)
    const cleanup = () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
      window.removeEventListener('hashchange', check)
      window.removeEventListener('popstate', check)
    }
    window.addEventListener('hashchange', check)
    window.addEventListener('popstate', check)
    check()
  })
}
