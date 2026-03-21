// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import { createClientFromScriptTag } from '../src/browser-entry.js'
import { resolveServerUrl } from '../src/mdp-client.js'

describe('browser entry', () => {
  it('uses the default browser server URL when attributes are missing', () => {
    expect(resolveServerUrl({})).toBe('ws://127.0.0.1:7070')
  })

  it('creates a browser client from script attributes', () => {
    const script = document.createElement('script')
    script.setAttribute('attr-mdp-server-host', 'localhost')
    script.setAttribute('attr-mdp-server-port', '8080')
    script.setAttribute('attr-mdp-server-protocol', 'wss')
    script.setAttribute('attr-mdp-client-id', 'browser-01')
    script.setAttribute('attr-mdp-client-name', 'Embedded Browser Client')
    script.setAttribute('attr-mdp-client-description', 'Created from a script tag')

    const client = createClientFromScriptTag(script)

    expect(client.describe()).toEqual({
      id: 'browser-01',
      name: 'Embedded Browser Client',
      description: 'Created from a script tag',
      platform: 'web',
      tools: [],
      prompts: [],
      skills: [],
      resources: []
    })
    expect(
      resolveServerUrl({
        serverHost: 'localhost',
        serverPort: 8080,
        serverProtocol: 'wss'
      })
    ).toBe('wss://localhost:8080')
    expect(
      resolveServerUrl({
        serverHost: 'localhost',
        serverPort: 8080,
        serverProtocol: 'https'
      })
    ).toBe('https://localhost:8080')
  })
})
