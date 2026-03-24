import { describe, expect, it } from 'vitest'

import {
  DEFAULT_EXTENSION_CONFIG,
  createRouteClientFromUrl,
  createRouteClientConfig,
  getOriginMatchPattern,
  isValidMatchPattern,
  listWorkspaceMatchPatterns,
  matchChromePattern,
  matchesRouteClient,
  normalizeConfig,
  parseMatchPatterns
} from '../src/shared/config.js'

describe('chrome extension config helpers', () => {
  it('normalizes missing values to defaults', () => {
    expect(normalizeConfig(undefined)).toEqual(DEFAULT_EXTENSION_CONFIG)
  })

  it('migrates legacy config into background and route clients', () => {
    const migrated = normalizeConfig({
      serverUrl: 'ws://127.0.0.1:47372',
      clientId: 'legacy-client',
      clientName: 'Legacy Chrome',
      clientDescription: 'Legacy description',
      autoConnect: true,
      autoInjectBridge: false,
      matchPatterns: ['https://app.example.com/*'],
      toolScriptSource: 'window.test = true;'
    })

    expect(migrated.backgroundClient.clientId).toBe('legacy-client-background')
    expect(migrated.routeClients).toHaveLength(1)
    expect(migrated.routeClients[0]?.clientId).toBe('legacy-client-page')
    expect(migrated.routeClients[0]?.autoInjectBridge).toBe(false)
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

  it('matches route clients against host patterns and path rules', () => {
    const client = createRouteClientConfig({
      matchPatterns: ['https://app.example.com/*'],
      routeRules: [
        {
          id: 'rule-1',
          mode: 'pathname-prefix',
          value: '/billing'
        }
      ]
    })

    expect(matchesRouteClient('https://app.example.com/billing/invoices', client)).toBe(true)
    expect(matchesRouteClient('https://app.example.com/settings/profile', client)).toBe(false)
  })

  it('creates route client presets from a live url', () => {
    const client = createRouteClientFromUrl('https://app.example.com/billing/invoices?id=1')

    expect(client.matchPatterns).toEqual(['https://app.example.com/*'])
    expect(client.routeRules[0]?.value).toBe('/billing/invoices')
    expect(client.clientName).toContain('app.example.com')
  })

  it('collects enabled route match patterns across the workspace', () => {
    const config = normalizeConfig({
      ...DEFAULT_EXTENSION_CONFIG,
      routeClients: [
        createRouteClientConfig({
          id: 'route-a',
          clientId: 'route-a',
          matchPatterns: ['https://app.example.com/*']
        }),
        createRouteClientConfig({
          id: 'route-b',
          clientId: 'route-b',
          matchPatterns: ['https://admin.example.com/*']
        })
      ]
    })

    expect(listWorkspaceMatchPatterns(config)).toEqual([
      'https://app.example.com/*',
      'https://admin.example.com/*'
    ])
  })

  it('converts active tab urls into permission patterns', () => {
    expect(getOriginMatchPattern('https://app.example.com/dashboard?id=1')).toBe(
      'https://app.example.com/*'
    )
    expect(getOriginMatchPattern('file:///Users/test/index.html')).toBe('file:///*')
    expect(getOriginMatchPattern('chrome://extensions')).toBeUndefined()
  })
})
