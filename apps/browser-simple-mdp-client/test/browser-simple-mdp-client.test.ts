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

    expect(Object.keys(client.tools)).toEqual([
      'browser.getPageBasics',
      'browser.clickElement',
      'browser.alertMessage'
    ])
    expect(Object.keys(client.skills)).toEqual([
      'browser-simple/overview',
      'browser-simple/tools',
      'browser-simple/examples'
    ])
  })

  it('boots from the current script tag through the global MDP API', async () => {
    const client = createFakeClient()
    const script = document.createElement('script')

    Object.defineProperty(document, 'currentScript', {
      configurable: true,
      value: script
    })
    ;(window as Window & { MDP?: { createClientFromScriptTag: typeof vi.fn } }).MDP = {
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

    await expect(client.tools['browser.getPageBasics']?.()).resolves.toEqual({
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
      client.tools['browser.clickElement']?.({ selector: 'button.primary' })
    ).resolves.toEqual({
      selector: 'button.primary',
      tagName: 'button',
      text: 'Save'
    })

    await expect(
      client.tools['browser.alertMessage']?.({ message: 'hello from mdp' })
    ).resolves.toEqual({
      delivered: true,
      message: 'hello from mdp'
    })
    expect(alertSpy).toHaveBeenCalledWith('hello from mdp')
  })
})

function createFakeClient() {
  const tools: Record<string, (args?: Record<string, unknown>) => unknown | Promise<unknown>> = {}
  const skills: Record<string, string> = {}
  let connected = false
  let registered = false

  return {
    tools,
    skills,
    get connected() {
      return connected
    },
    get registered() {
      return registered
    },
    exposeTool(name: string, handler: (args?: Record<string, unknown>) => unknown | Promise<unknown>) {
      tools[name] = handler
      return this
    },
    exposeSkill(name: string, content: string) {
      skills[name] = content
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
        platform: 'web'
      }
    }
  }
}
