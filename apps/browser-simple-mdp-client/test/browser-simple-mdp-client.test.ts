// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  bootBrowserSimpleMdpClient,
  registerBrowserSimpleCapabilities
} from '#~/index.js'

describe('browser simple mdp client', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    document.title = 'Simple Browser Client Test'
    window.history.replaceState({}, '', '/demo?topic=mdp')
  })

  it('registers the built-in tools and skills', async () => {
    const client = createFakeClient()

    registerBrowserSimpleCapabilities(client)

    expect(Object.keys(client.endpoints)).toEqual([
      '/browser/page-basics',
      '/browser/click-element',
      '/browser/alert-message'
    ])
    expect(Object.keys(client.skills)).toEqual([
      '/browser-simple/overview/skill.md',
      '/browser-simple/tools/skill.md',
      '/browser-simple/examples/skill.md'
    ])
  })

  it('boots from the current script tag through the global MDP API', async () => {
    const client = createFakeClient()
    const script = document.createElement('script')
    const windowWithMdp = window as Window & {
      MDP?: {
        createClientFromScriptTag: (
          script?: HTMLScriptElement
        ) => ReturnType<typeof createFakeClient>
      }
    }

    Object.defineProperty(document, 'currentScript', {
      configurable: true,
      value: script
    })
    windowWithMdp.MDP = {
      createClientFromScriptTag: vi.fn(() => client)
    }

    await bootBrowserSimpleMdpClient({ script })

    expect(client.connected).toBe(true)
    expect(client.registered).toBe(true)
  })

  it('implements the page basics, click, and alert tools', async () => {
    const client = createFakeClient()
    const button = document.createElement('button')
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const currentLocation = new URL(window.location.href)

    button.className = 'primary'
    button.textContent = 'Save'
    document.body.append(button)

    registerBrowserSimpleCapabilities(client)

    await expect(client.endpoints['/browser/page-basics']?.({
      params: {},
      queries: {},
      headers: {}
    })).resolves.toEqual({
      title: 'Simple Browser Client Test',
      url: currentLocation.href,
      origin: currentLocation.origin,
      pathname: currentLocation.pathname,
      hash: currentLocation.hash,
      query: {
        topic: 'mdp'
      }
    })

    await expect(
      client.endpoints['/browser/click-element']?.({
        params: {},
        queries: {},
        headers: {},
        body: { selector: 'button.primary' }
      })
    ).resolves.toEqual({
      selector: 'button.primary',
      tagName: 'button',
      text: 'Save'
    })

    await expect(
      client.endpoints['/browser/alert-message']?.({
        params: {},
        queries: {},
        headers: {},
        body: { message: 'hello from mdp' }
      })
    ).resolves.toEqual({
      delivered: true,
      message: 'hello from mdp'
    })
    expect(alertSpy).toHaveBeenCalledWith('hello from mdp')
  })
})

function createFakeClient() {
  const endpoints: Record<string, (request: {
    params: Record<string, unknown>
    queries: Record<string, unknown>
    headers: Record<string, string>
    body?: unknown
  }) => unknown | Promise<unknown>> = {}
  const skills: Record<string, () => Promise<string>> = {}
  let connected = false
  let registered = false

  return {
    endpoints,
    skills,
    get connected() {
      return connected
    },
    get registered() {
      return registered
    },
    expose(path: string, definition: string | { method?: string }, handler?: (...args: any[]) => unknown | Promise<unknown>) {
      if (path.endsWith('/skill.md')) {
        if (typeof definition === 'string') {
          skills[path] = async () => definition
          return this
        }

        if (!handler) {
          throw new Error(`Expected skill handler for ${path}`)
        }

        skills[path] = async () => String(await handler())
        return this
      }

      if (typeof definition === 'string' || !handler) {
        throw new Error(`Expected endpoint descriptor and handler for ${path}`)
      }

      endpoints[path] = handler as (request: {
        params: Record<string, unknown>
        queries: Record<string, unknown>
        headers: Record<string, string>
        body?: unknown
      }) => unknown | Promise<unknown>
      return this
    },
    async connect() {
      connected = true
    },
    register() {
      registered = true
    },
    describe() {
      return {
        id: 'browser-simple-01',
        name: 'Browser Simple Client',
        platform: 'web',
        paths: [
          ...Object.keys(endpoints).map((path) => ({
            type: 'endpoint' as const,
            method: 'GET',
            path
          })),
          ...Object.keys(skills).map((path) => ({
            type: 'skill' as const,
            path
          }))
        ]
      }
    }
  }
}
