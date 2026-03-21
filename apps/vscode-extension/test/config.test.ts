import { describe, expect, it } from 'vitest'

import { DEFAULT_EXTENSION_CONFIGURATION, isValidServerUrl, readExtensionConfiguration } from '../src/config.js'

function createConfiguration(values: Record<string, unknown>) {
  return {
    get<T>(section: string, defaultValue?: T): T | undefined {
      if (section in values) {
        return values[section] as T
      }

      return defaultValue
    }
  }
}

describe('vscode extension config', () => {
  it('applies defaults when settings are missing', () => {
    expect(readExtensionConfiguration(createConfiguration({}))).toEqual(
      DEFAULT_EXTENSION_CONFIGURATION
    )
  })

  it('normalizes string and numeric settings', () => {
    expect(
      readExtensionConfiguration(
        createConfiguration({
          serverUrl: '  http://127.0.0.1:7070  ',
          autoConnect: false,
          autoReconnect: false,
          reconnectDelayMs: 9_999.8,
          clientId: ' custom-id ',
          clientName: ' Custom Name ',
          authToken: ' token ',
          allowedCommands: [' workbench.action.files.save ', '', 'workbench.action.files.save'],
          findFilesMaxResults: 123.9,
          textSearchMaxResults: 88.8,
          resourceTextLimit: 600,
          diagnosticResultLimit: 12
        })
      )
    ).toEqual({
      serverUrl: 'http://127.0.0.1:7070',
      autoConnect: false,
      autoReconnect: false,
      reconnectDelayMs: 9999,
      clientId: 'custom-id',
      clientName: 'Custom Name',
      authToken: 'token',
      allowedCommands: ['workbench.action.files.save'],
      findFilesMaxResults: 123,
      textSearchMaxResults: 88,
      resourceTextLimit: 600,
      diagnosticResultLimit: 12
    })
  })

  it('validates supported server URL schemes', () => {
    expect(isValidServerUrl('ws://127.0.0.1:7070')).toBe(true)
    expect(isValidServerUrl('https://example.com')).toBe(true)
    expect(isValidServerUrl('ftp://example.com')).toBe(false)
    expect(isValidServerUrl('not-a-url')).toBe(false)
  })

  it('bounds reconnect delay to a safe range', () => {
    expect(
      readExtensionConfiguration(
        createConfiguration({
          reconnectDelayMs: 999_999
        })
      ).reconnectDelayMs
    ).toBe(60_000)
  })
})
