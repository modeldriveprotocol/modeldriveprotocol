import { describe, expect, it } from 'vitest'

import {
  DEFAULT_EXTENSION_CONFIG,
  getOriginMatchPattern,
  isValidMatchPattern,
  matchChromePattern,
  normalizeConfig,
  parseMatchPatterns
} from '../src/shared/config.js'

describe('chrome extension config helpers', () => {
  it('normalizes missing values to defaults', () => {
    expect(normalizeConfig(undefined)).toEqual(DEFAULT_EXTENSION_CONFIG)
  })

  it('deduplicates and trims match patterns', () => {
    expect(
      parseMatchPatterns(' https://app.example.com/* \nhttps://app.example.com/*\n')
    ).toEqual(['https://app.example.com/*'])
  })

  it('validates basic chrome match patterns', () => {
    expect(isValidMatchPattern('https://app.example.com/*')).toBe(true)
    expect(isValidMatchPattern('not-a-pattern')).toBe(false)
  })

  it('matches wildcard subdomains', () => {
    expect(
      matchChromePattern('https://*.example.com/*', 'https://admin.example.com/dashboard')
    ).toBe(true)
    expect(
      matchChromePattern('https://*.example.com/*', 'https://elsewhere.dev/dashboard')
    ).toBe(false)
  })

  it('converts active tab urls into permission patterns', () => {
    expect(getOriginMatchPattern('https://app.example.com/dashboard?id=1')).toBe(
      'https://app.example.com/*'
    )
    expect(getOriginMatchPattern('file:///Users/test/index.html')).toBe('file:///*')
    expect(getOriginMatchPattern('chrome://extensions')).toBeUndefined()
  })
})
